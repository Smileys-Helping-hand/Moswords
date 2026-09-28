import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF guard for cookie-authenticated API writes.
 *
 * Session cookies are SameSite=None in production (the Android WebView needs
 * it), so a third-party page could otherwise POST to /api/* with the user's
 * cookie attached. Browsers always send `Origin` on cross-site writes, so any
 * write whose Origin doesn't match this host is refused.
 *
 * Machine-to-machine calls from ecosystem apps authenticate with an API key
 * header and carry no cookies, so they are not subject to CSRF and pass through.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// WebView shells and local dev servers that legitimately embed the app.
const TRUSTED_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:3000',
]);

export function proxy(request: NextRequest) {
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
