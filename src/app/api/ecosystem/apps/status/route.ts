/**
 * GET /api/ecosystem/apps/status - Get status of all connected apps
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { connectedApps, ecosystemApiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;

    // Get all connected apps for this user
    const apps = await db.query.connectedApps.findMany({
      where: eq(connectedApps.userId, userId),
      with: {
        apiKey: {
          columns: {
            status: true,
            totalRequests: true,
            lastUsedAt: true,
          },
        },
      },
    });

    const appStatuses = apps.map((app) => ({
      id: app.id,
      appName: app.appName,
      status: app.status,
      lastHealthCheck: app.lastHealthCheck,
      lastError: app.lastError,
      consecutiveErrors: app.consecutiveErrors,
      connectedAt: app.connectedAt,
      apiKey: app.apiKey ? {
        status: app.apiKey.status,
        totalRequests: app.apiKey.totalRequests,
        lastUsedAt: app.apiKey.lastUsedAt,
      } : null,
      metadata: app.metadata,
    }));

    // Calculate health stats
    const healthStatus = {
      connected: appStatuses.filter((a) => a.status === 'connected').length,
      error: appStatuses.filter((a) => a.status === 'error').length,
      disabled: appStatuses.filter((a) => a.status === 'disabled').length,
      total: appStatuses.length,
    };

    return NextResponse.json({
      apps: appStatuses,
      health: healthStatus,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Apps Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
