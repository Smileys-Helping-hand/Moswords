/**
 * GET    /api/ecosystem/keys/[keyId] - Get key details & status
 * PATCH  /api/ecosystem/keys/[keyId] - Update key (rotate, permissions)
 * DELETE /api/ecosystem/keys/[keyId] - Revoke/delete key
 */

import { NextRequest, NextResponse } from 'next/server';
import { ALL_SCOPES, hashApiKey, type EcosystemScope } from '@/lib/ecosystem-auth';
import { requireAdmin } from '@/lib/session';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ecosystemApiKeys, apiRequestLogs } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ keyId: string }> }
) {
  const params = await paramsPromise;
  try {
    const admin = await requireAdmin();
    if (admin.response) return admin.response;
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
  { params: paramsPromise }: { params: Promise<{ keyId: string }> }
) {
  const params = await paramsPromise;
  try {
    const admin = await requireAdmin();
    if (admin.response) return admin.response;
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

    if (Array.isArray(permissions)) {
      const invalid = permissions.filter((p: string) => !ALL_SCOPES.includes(p as EcosystemScope));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Unknown permissions: ${invalid.join(', ')}`, allowed: ALL_SCOPES }, { status: 400 });
      }
      updates.permissions = permissions;
    }

    // A rotated secret is shown once and stored hashed, like the key itself.
    let newSecret: string | undefined;
    if (rotateSecret) {
      newSecret = crypto.randomBytes(32).toString('hex');
      updates.apiSecret = hashApiKey(newSecret);
    }

    if (typeof rateLimitPerMinute === 'number' && rateLimitPerMinute > 0) {
      updates.rateLimitPerMinute = Math.min(Math.floor(rateLimitPerMinute), 10_000);
    }

    const updated = await db
      .update(ecosystemApiKeys)
      .set(updates)
      .where(eq(ecosystemApiKeys.id, params.keyId))
      .returning({
        id: ecosystemApiKeys.id,
        appName: ecosystemApiKeys.appName,
        keyPrefix: ecosystemApiKeys.keyPrefix,
        status: ecosystemApiKeys.status,
        permissions: ecosystemApiKeys.permissions,
        rateLimitPerMinute: ecosystemApiKeys.rateLimitPerMinute,
      });

    return NextResponse.json({
      ...(newSecret ? { apiSecret: newSecret } : {}),
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
  { params: paramsPromise }: { params: Promise<{ keyId: string }> }
) {
  const params = await paramsPromise;
  try {
    const admin = await requireAdmin();
    if (admin.response) return admin.response;
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
