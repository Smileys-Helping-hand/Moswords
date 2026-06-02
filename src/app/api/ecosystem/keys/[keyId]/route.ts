/**
 * GET    /api/ecosystem/keys/[keyId] - Get key details & status
 * PATCH  /api/ecosystem/keys/[keyId] - Update key (rotate, permissions)
 * DELETE /api/ecosystem/keys/[keyId] - Revoke/delete key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ecosystemApiKeys, apiRequestLogs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;

    // Get key details
    const key = await db.query.ecosystemApiKeys.findFirst({
      where: and(
        eq(ecosystemApiKeys.id, params.keyId),
        eq(ecosystemApiKeys.ownerId, userId)
      ),
      columns: {
        apiSecret: false, // Never return secret
      },
    });

    if (!key) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    // Get recent logs
    const logs = await db.query.apiRequestLogs.findMany({
      where: eq(apiRequestLogs.apiKeyId, params.keyId),
      limit: 10,
      orderBy: (logs) => logs.createdAt,
    });

    return NextResponse.json({
      key,
      recentLogs: logs,
      stats: {
        totalRequests: key.totalRequests,
        lastUsed: key.lastUsedAt,
        status: key.status,
        rateLimitPerMinute: key.rateLimitPerMinute,
      },
    });
  } catch (error) {
    console.error('[Key Details] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const body = await request.json();
    const { action, permissions, rotateSecret, rateLimitPerMinute } = body;

    // Verify ownership
    const key = await db.query.ecosystemApiKeys.findFirst({
      where: and(
        eq(ecosystemApiKeys.id, params.keyId),
        eq(ecosystemApiKeys.ownerId, userId)
      ),
    });

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (action === 'revoke') {
      updates.status = 'revoked';
    }

    if (permissions) {
      updates.permissions = permissions;
    }

    if (rotateSecret) {
      updates.apiSecret = crypto.randomBytes(32).toString('hex');
    }

    if (rateLimitPerMinute) {
      updates.rateLimitPerMinute = rateLimitPerMinute;
    }

    const updated = await db
      .update(ecosystemApiKeys)
      .set(updates)
      .where(eq(ecosystemApiKeys.id, params.keyId))
      .returning({ apiSecret: false });

    return NextResponse.json({
      success: true,
      key: updated[0],
      ...(rotateSecret && {
        warning: 'New secret generated. Update your app configuration.',
      }),
    });
  } catch (error) {
    console.error('[Key Update] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;

    // Verify ownership
    const key = await db.query.ecosystemApiKeys.findFirst({
      where: and(
        eq(ecosystemApiKeys.id, params.keyId),
        eq(ecosystemApiKeys.ownerId, userId)
      ),
    });

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Delete the key
    await db
      .delete(ecosystemApiKeys)
      .where(eq(ecosystemApiKeys.id, params.keyId));

    return NextResponse.json({
      success: true,
      message: 'API key deleted',
    });
  } catch (error) {
    console.error('[Key Delete] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
