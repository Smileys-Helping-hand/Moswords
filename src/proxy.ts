import { NextRequest, NextResponse } from 'next/server';

/**
 * Runs in front of every /api request.
 *
 * 1. Malformed ids → 404 before any route runs. Ids in these paths are UUIDs;
 *    anything else used to reach Postgres and come back as a 500.
 * 2. CSRF guard for cookie-authenticated writes. Session cookies are
 *    SameSite=None in production (the Android WebView needs it), so a
 *    third-party page could otherwise POST with the user's cookie. Browsers
 *    always send `Origin` on cross-site writes, so any write whose Origin
 *    doesn't match this host is refused. Ecosystem apps authenticate with an
 *    API key header and carry no cookies, so they pass through.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// WebView shells and local dev servers that legitimately embed the app.
const TRUSTED_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:3000',
]);

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const UUID_RE = new RegExp(`^${UUID}$`);

// Collections whose next path segment is an id. Literal sub-routes that are not
// ids (e.g. /api/users/search, /api/contacts/sync) are listed as exceptions.
const ID_COLLECTION = /^\/api\/(group-chats|servers|channels|messages|statuses|direct-messages|approvals|conversations|friends|users|contacts|chats\/folders|v1\/contacts|ecosystem\/keys|keys\/api-keys)\/([^/]+)/;
const NOT_IDS = new Set(['search', 'sync', 'encrypt']);
const NESTED_ID = /\/(messages|members)\/([^/]+)\/?$/;

function hasMalformedId(pathname: string): boolean {
  const match = ID_COLLECTION.exec(pathname);
  if (match && !NOT_IDS.has(match[2]) && !UUID_RE.test(match[2])) return true;
  if (pathname.startsWith('/api/group-chats/')) {
    const nested = NESTED_ID.exec(pathname);
    if (nested && !UUID_RE.test(nested[2])) return true;
  }
  return false;
}

export function proxy(request: NextRequest) {
  if (hasMalformedId(request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const headers = request.headers;
  if (headers.get('authorization') || headers.get('x-api-key')) return NextResponse.next();

  const origin = headers.get('origin');
  if (!origin || TRUSTED_ORIGINS.has(origin)) return NextResponse.next();

  const host = headers.get('x-forwarded-host') || headers.get('host');
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // malformed Origin header — treat as foreign
  }

  if (originHost && originHost === host) return NextResponse.next();

  return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
}

export const config = {
  matcher: '/api/:path*',
};
