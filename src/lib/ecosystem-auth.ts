import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq, or, sql } from 'drizzle-orm';
import { db } from './db';
import { ecosystemApiKeys, users } from './schema';
import { normalizeEmail } from './validate';
import { rateLimit } from './rate-limit';

/**
 * Authentication for ecosystem apps (Nexus, Second-Brain, FinancePlay, …)
 * calling AwehChat server-to-server.
 *
 * Keys are issued by an admin on /ecosystem and stored only as SHA-256 hashes.
 * Send them as `Authorization: Bearer <key>` (or `X-Api-Key`). Older
 * integrations that put `apiKey` in the body/query still work.
 *
 * Each key carries scopes; routes ask for the one they need.
 */
export type EcosystemScope =
  | 'contacts.read'
  | 'contacts.write'
  | 'friends.read'
  | 'friends.write'
  | 'profile.read';

export const ALL_SCOPES: EcosystemScope[] = [
  'contacts.read',
  'contacts.write',
  'friends.read',
  'friends.write',
  'profile.read',
];

export interface AppIdentity {
  keyId: string;
  appName: string;
  scopes: Set<string>;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
}

/** A fresh key: `<prefix>_<48 hex>`. Returns the plaintext (show once) and what to store. */
export function generateApiKey(appName: string) {
  const prefix = appName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'app';
  const key = `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
  return { key, hash: hashApiKey(key), displayPrefix: key.slice(0, prefix.length + 5) };
}

function presentedKey(request: NextRequest, legacyKey?: unknown): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim() || null;
  const header = request.headers.get('x-api-key');
  if (header) return header.trim();
  return typeof legacyKey === 'string' && legacyKey ? legacyKey : null;
}

type AuthResult = { app: AppIdentity; response?: undefined } | { app?: undefined; response: NextResponse };

export async function authenticateApp(
  request: NextRequest,
  scope: EcosystemScope,
  legacyKey?: unknown,
): Promise<AuthResult> {
  const key = presentedKey(request, legacyKey);
  if (!key || key.length > 200) {
    return { response: NextResponse.json({ error: 'Missing API key' }, { status: 401 }) };
  }

  const hash = hashApiKey(key);
  const [record] = await db
    .select({
      id: ecosystemApiKeys.id,
      appName: ecosystemApiKeys.appName,
      status: ecosystemApiKeys.status,
      permissions: ecosystemApiKeys.permissions,
      expiresAt: ecosystemApiKeys.expiresAt,
      rateLimitPerMinute: ecosystemApiKeys.rateLimitPerMinute,
      lastUsedAt: ecosystemApiKeys.lastUsedAt,
    })
    .from(ecosystemApiKeys)
    // key_hash for hashed keys; api_key = key covers any row the migration hasn't hashed yet.
    .where(or(eq(ecosystemApiKeys.keyHash, hash), eq(ecosystemApiKeys.apiKey, key)))
    .limit(1);

  if (!record) {
    return { response: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) };
  }
  if (record.status !== 'active') {
    return { response: NextResponse.json({ error: `API key is ${record.status}` }, { status: 403 }) };
  }
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    return { response: NextResponse.json({ error: 'API key has expired' }, { status: 403 }) };
  }

  const scopes = new Set(record.permissions ?? []);
  if (!scopes.has(scope)) {
    return {
      response: NextResponse.json(
        { error: `This key lacks the "${scope}" permission. Ask an admin to grant it on /ecosystem.` },
        { status: 403 },
      ),
    };
  }

  const limit = await rateLimit(`app:${record.id}`, record.rateLimitPerMinute || 100, 60);
  if (!limit.allowed) {
    return {
      response: NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } },
      ),
    };
  }

  // Usage stats: at most one write per key per minute.
  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 60_000) {
    db.update(ecosystemApiKeys)
      .set({ lastUsedAt: new Date(), totalRequests: sql`${ecosystemApiKeys.totalRequests} + 1` })
      .where(eq(ecosystemApiKeys.id, record.id))
      .catch(() => {});
  }

  return { app: { keyId: record.id, appName: record.appName, scopes } };
}

/**
 * Resolve the AwehChat user an app is acting for, from `X-User-Email` or a
 * `userEmail` field. First-party apps are trusted to assert which of their
 * signed-in users they are acting for; the key's scopes bound what they can do.
 */
export async function resolveActingUser(
  request: NextRequest,
  fromBody?: unknown,
): Promise<{ user: { id: string; email: string }; response?: undefined } | { user?: undefined; response: NextResponse }> {
  const email = normalizeEmail(
    request.headers.get('x-user-email') || request.nextUrl.searchParams.get('userEmail') || fromBody,
  );
  if (!email) {
    return { response: NextResponse.json({ error: 'userEmail (or X-User-Email header) is required' }, { status: 400 }) };
  }
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (!user) {
    return { response: NextResponse.json({ error: 'No AwehChat account for that email' }, { status: 404 }) };
  }
  return { user };
}
