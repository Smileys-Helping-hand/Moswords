import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET /api/v1/health — unauthenticated liveness check for ecosystem apps. */
export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'awehchat-v1', time: new Date().toISOString() });
}
