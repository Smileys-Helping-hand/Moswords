import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from './db';
import { contacts, friends, users } from './schema';
import { isEmail, normalizeEmail, normalizePhone } from './validate';

/**
 * The ecosystem contact book.
 *
 * AwehChat is the source of truth for a person's contacts across every app in
 * the ecosystem. Apps push contacts in (upsert, de-duplicated by email/phone),
 * pull changes out with a delta cursor (deletions arrive as tombstones), and
 * see which contacts are already on AwehChat.
 */

export interface ContactInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  company?: string | null;
  label?: string | null;
  notes?: string | null;
  /** The calling app's own id for this contact, so re-syncs update rather than duplicate. */
  externalId?: string | null;
}

export interface ContactOut {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photoURL: string | null;
  company: string | null;
  label: string | null;
  notes: string | null;
  source: string;
  syncedToApps: string[];
  externalIds: Record<string, string>;
  /** AwehChat user id when this contact has an account (so apps can offer "message" instead of "invite"). */
  awehchatUserId: string | null;
  updatedAt: string;
  deletedAt: string | null;
}

type ContactMetadata = {
  label?: string;
  company?: string;
  notes?: string;
  externalIds?: Record<string, string>;
};

type ContactRow = typeof contacts.$inferSelect;

export const MAX_BATCH = 500;

function format(row: ContactRow, awehchatUserId: string | null): ContactOut {
  const meta = (row.metadata || {}) as ContactMetadata;
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phoneNumber ?? null,
    photoURL: row.photoURL ?? null,
    company: meta.company ?? null,
    label: meta.label ?? null,
    notes: meta.notes ?? null,
    source: row.source,
    syncedToApps: row.syncedToApps ?? [],
    externalIds: meta.externalIds ?? {},
    awehchatUserId,
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

/** Map normalized emails to AwehChat user ids. */
async function accountsFor(emails: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(emails.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(sql`lower(${users.email})`, unique));
  return new Map(rows.map((r) => [r.email.toLowerCase(), r.id]));
}

async function withAccounts(rows: ContactRow[]): Promise<ContactOut[]> {
  const accounts = await accountsFor(rows.map((r) => r.emailNormalized || normalizeEmail(r.email)));
  return rows.map((r) => format(r, accounts.get(r.emailNormalized || normalizeEmail(r.email)) ?? null));
}

// ── Cursor: base64url("<updatedAt ISO>|<id>") for stable keyset paging ─────
export function encodeCursor(updatedAt: string, id: string): string {
  return Buffer.from(`${updatedAt}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string | null): { at: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    const at = new Date(iso);
    return isNaN(at.getTime()) || !id ? null : { at, id };
  } catch {
    return null;
  }
}

/**
 * List contacts. Without a cursor: every live contact. With a cursor (from a
 * previous response's `nextCursor`): everything changed since, including
 * deletions (deletedAt set), so a client can mirror the book exactly.
 */
export async function listContacts(
  userId: string,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<{ contacts: ContactOut[]; nextCursor: string | null; hasMore: boolean }> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), MAX_BATCH);
  const after = decodeCursor(opts.cursor ?? null);

  const where = after
    ? and(eq(contacts.userId, userId), sql`(${contacts.updatedAt}, ${contacts.id}) > (${after.at.toISOString()}::timestamp, ${after.id}::uuid)`)
    : and(eq(contacts.userId, userId), isNull(contacts.deletedAt));

  const rows = await db
    .select()
    .from(contacts)
    .where(where)
    .orderBy(asc(contacts.updatedAt), asc(contacts.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const out = await withAccounts(page);
  const last = page[page.length - 1];
  // Always hand back a cursor so the next call is a cheap delta, even when empty.
  const nextCursor = last
    ? encodeCursor(last.updatedAt.toISOString(), last.id)
    : opts.cursor ?? encodeCursor(new Date().toISOString(), '00000000-0000-0000-0000-000000000000');
  return { contacts: out, nextCursor, hasMore };
}

/** People the user is connected with on AwehChat (accepted friends), shaped like contacts. */
export async function listConnections(userId: string) {
  const rows = await db
    .select({
      friendshipId: friends.id,
      userId: friends.userId,
      friendId: friends.friendId,
      acceptedAt: friends.acceptedAt,
    })
    .from(friends)
    .where(and(eq(friends.status, 'accepted'), or(eq(friends.userId, userId), eq(friends.friendId, userId))));

  const otherIds = Array.from(new Set(rows.map((r) => (r.userId === userId ? r.friendId : r.userId))));
  if (otherIds.length === 0) return [];
  const people = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      displayName: users.displayName,
      photoURL: users.photoURL,
    })
    .from(users)
    .where(inArray(users.id, otherIds));
  return people.map((p) => ({
    awehchatUserId: p.id,
    name: p.displayName || p.name || p.email.split('@')[0],
    email: p.email,
    photoURL: p.photoURL,
  }));
}

export interface UpsertResult {
  index: number;
  id?: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

/**
 * Insert or update contacts. Matching, in order: this app's externalId, then
 * email, then phone — so the same person synced from three apps stays one
 * contact. Existing values are never blanked by a partial update.
 */
export async function upsertContacts(
  userId: string,
  appName: string,
  inputs: ContactInput[],
): Promise<UpsertResult[]> {
  const app = appName.toLowerCase().slice(0, 40);
  const results: UpsertResult[] = [];
  const cleaned: { index: number; email: string; phone: string; input: ContactInput }[] = [];

  inputs.slice(0, MAX_BATCH).forEach((input, index) => {
    const email = input.email ? normalizeEmail(input.email) : '';
    const phone = normalizePhone(input.phone);
    if (email && !isEmail(email)) {
      results.push({ index, action: 'skipped', error: 'invalid email' });
    } else if (!email && !phone && !input.externalId) {
      results.push({ index, action: 'skipped', error: 'email, phone or externalId required' });
    } else {
      cleaned.push({ index, email, phone, input });
    }
  });
  if (cleaned.length === 0) return results.sort((a, b) => a.index - b.index);

  const emails = cleaned.map((c) => c.email).filter(Boolean);
  const phones = cleaned.map((c) => c.phone).filter(Boolean);
  const externalIds = cleaned.map((c) => c.input.externalId).filter((x): x is string => !!x);

  const existing = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        or(
          emails.length ? inArray(contacts.emailNormalized, emails) : sql`false`,
          phones.length ? inArray(contacts.phoneNormalized, phones) : sql`false`,
          externalIds.length
            ? sql`${contacts.metadata} -> 'externalIds' ->> ${app} IN (${sql.join(externalIds.map((x) => sql`${x}`), sql`, `)})`
            : sql`false`,
        ),
      ),
    );

  const byExternal = new Map<string, ContactRow>();
  const byEmail = new Map<string, ContactRow>();
  const byPhone = new Map<string, ContactRow>();
  for (const row of existing) {
    const ext = ((row.metadata || {}) as ContactMetadata).externalIds?.[app];
    if (ext) byExternal.set(ext, row);
    if (row.emailNormalized) byEmail.set(row.emailNormalized, row);
    if (row.phoneNormalized) byPhone.set(row.phoneNormalized, row);
  }

  const now = new Date();
  const toInsert: (typeof contacts.$inferInsert)[] = [];
  const insertIndexes: number[] = [];
  const updates: Promise<void>[] = [];

  for (const { index, email, phone, input } of cleaned) {
    const match =
      (input.externalId && byExternal.get(input.externalId)) ||
      (email && byEmail.get(email)) ||
      (phone && byPhone.get(phone)) ||
      null;

    const name = (input.name || '').trim().slice(0, 200) || email.split('@')[0] || phone || 'Unnamed contact';

    if (!match) {
      const metadata: ContactMetadata = {
        ...(input.company ? { company: input.company.slice(0, 200) } : {}),
        ...(input.label ? { label: input.label.slice(0, 100) } : {}),
        ...(input.notes ? { notes: input.notes.slice(0, 2000) } : {}),
        ...(input.externalId ? { externalIds: { [app]: String(input.externalId).slice(0, 200) } } : {}),
      };
      toInsert.push({
        userId,
        name,
        email: email || null,
        emailNormalized: email || null,
        phoneNumber: input.phone?.trim() || null,
        phoneNormalized: phone || null,
        photoURL: input.photoURL || null,
        source: app,
        syncedToApps: [app],
        metadata: metadata as any,
        createdAt: now,
        updatedAt: now,
      });
      insertIndexes.push(index);
      // Later rows in the same batch must see this one to avoid duplicates.
      const placeholder = { id: '', metadata, emailNormalized: email, phoneNormalized: phone } as unknown as ContactRow;
      if (email) byEmail.set(email, placeholder);
      if (phone) byPhone.set(phone, placeholder);
      if (input.externalId) byExternal.set(input.externalId, placeholder);
      continue;
    }

    if (!match.id) {
      results.push({ index, action: 'skipped', error: 'duplicate of an earlier item in this batch' });
      continue;
    }

    const meta = { ...((match.metadata || {}) as ContactMetadata) };
    if (input.company) meta.company = input.company.slice(0, 200);
    if (input.label) meta.label = input.label.slice(0, 100);
    if (input.notes) meta.notes = input.notes.slice(0, 2000);
    if (input.externalId) meta.externalIds = { ...(meta.externalIds || {}), [app]: String(input.externalId).slice(0, 200) };

    const synced = Array.from(new Set([...(match.syncedToApps || []), app]));
    updates.push(
      db
        .update(contacts)
        .set({
          name: input.name?.trim() ? name : match.name,
          email: email || match.email,
          emailNormalized: email || match.emailNormalized,
          phoneNumber: input.phone?.trim() || match.phoneNumber,
          phoneNormalized: phone || match.phoneNormalized,
          photoURL: input.photoURL || match.photoURL,
          syncedToApps: synced,
          metadata: meta as any,
          deletedAt: null, // re-adding a deleted contact restores it
          updatedAt: now,
        })
        .where(and(eq(contacts.id, match.id), eq(contacts.userId, userId)))
        .then(() => {
          results.push({ index, id: match.id, action: 'updated' });
        }),
    );
  }

  // Updates run 10 at a time; each is one small HTTP round trip to Neon.
  for (let i = 0; i < updates.length; i += 10) {
    await Promise.all(updates.slice(i, i + 10));
  }

  if (toInsert.length > 0) {
    const inserted = await db.insert(contacts).values(toInsert).returning({ id: contacts.id });
    inserted.forEach((row, i) => results.push({ index: insertIndexes[i], id: row.id, action: 'created' }));
  }

  return results.sort((a, b) => a.index - b.index);
}

/** Soft-delete so delta-syncing apps learn about it. */
export async function deleteContact(userId: string, contactId: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .update(contacts)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId), isNull(contacts.deletedAt)))
    .returning({ id: contacts.id });
  return rows.length > 0;
}

export async function getContact(userId: string, contactId: string): Promise<ContactOut | null> {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1);
  if (!row) return null;
  const [out] = await withAccounts([row]);
  return out;
}

/** Which of these emails belong to AwehChat accounts. */
export async function lookupAccounts(emails: string[]) {
  const normalized = emails.map(normalizeEmail).filter(isEmail).slice(0, MAX_BATCH);
  if (normalized.length === 0) return [];
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      displayName: users.displayName,
      photoURL: users.photoURL,
    })
    .from(users)
    .where(inArray(sql`lower(${users.email})`, normalized));
  return rows.map((u) => ({
    email: u.email.toLowerCase(),
    awehchatUserId: u.id,
    name: u.displayName || u.name,
    photoURL: u.photoURL,
  }));
}

/** Edit a contact by id (the in-app editor). Unlike upsert, this may change email/phone. */
export async function updateContact(
  userId: string,
  contactId: string,
  input: ContactInput,
): Promise<ContactOut | null> {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1);
  if (!row) return null;

  const email = input.email === undefined ? row.email : input.email ? normalizeEmail(input.email) : null;
  if (email && !isEmail(email)) return null;
  const phone = input.phone === undefined ? row.phoneNumber : input.phone?.trim() || null;
  const meta = { ...((row.metadata || {}) as ContactMetadata) };
  if (input.company !== undefined) meta.company = input.company || undefined;
  if (input.label !== undefined) meta.label = input.label || undefined;
  if (input.notes !== undefined) meta.notes = input.notes || undefined;

  await db
    .update(contacts)
    .set({
      name: input.name?.trim() ? input.name.trim().slice(0, 200) : row.name,
      email,
      emailNormalized: email,
      phoneNumber: phone,
      phoneNormalized: normalizePhone(phone) || null,
      photoURL: input.photoURL === undefined ? row.photoURL : input.photoURL,
      metadata: meta as any,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));

  return getContact(userId, contactId);
}

/** Mark a contact as shared with an app (the "sync to …" buttons). Apps then receive it via delta sync. */
export async function shareContactWith(userId: string, contactId: string, app: string): Promise<ContactOut | null> {
  const [row] = await db
    .select({ synced: contacts.syncedToApps })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1);
  if (!row) return null;
  await db
    .update(contacts)
    .set({ syncedToApps: Array.from(new Set([...(row.synced || []), app.toLowerCase()])), updatedAt: new Date() })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
  return getContact(userId, contactId);
}

/** Every live contact (paged internally) — for the in-app contact book. */
export async function allContacts(userId: string): Promise<ContactOut[]> {
  const out: ContactOut[] = [];
  let cursor: string | null = null;
  // The first page (no cursor) is live-only; later pages are deltas, so drop tombstones.
  for (let i = 0; i < 10; i++) {
    const page = await listContacts(userId, { cursor, limit: MAX_BATCH });
    out.push(...page.contacts.filter((c) => !c.deletedAt));
    if (!page.hasMore) break;
    cursor = page.nextCursor;
  }
  return out;
}

/** Shape used by the in-app ContactManager / useContactSync. */
export function toUiContact(c: ContactOut, userId: string) {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? undefined,
    avatar: c.photoURL ?? undefined,
    userId,
    lastSynced: c.updatedAt,
    syncedWith: c.syncedToApps,
    customData: { company: c.company, label: c.label, notes: c.notes, awehchatUserId: c.awehchatUserId },
  };
}
