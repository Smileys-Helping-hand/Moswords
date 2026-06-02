/**
 * GET /api/second-brain/health
 *
 * Check if Second Brain is running and accessible
 * No authentication required - used for service discovery
 *
 * Response:
 * {
 *   status: "ok",
 *   service: "second-brain",
 *   timestamp: number,
 *   version: "1.0.0"
 * }
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'second-brain',
      timestamp: Date.now(),
      version: '1.0.0',
      endpoints: {
        auth: '/api/second-brain/auth/me',
        gateway: '/api/second-brain/data/gateway',
        health: '/api/second-brain/health',
      },
    },
    { status: 200 }
  );
}
