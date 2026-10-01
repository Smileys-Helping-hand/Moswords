/**
 * GET  /api/ecosystem/keys - List all API keys (admin only)
 * POST /api/ecosystem/keys - Create a new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/session';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ecosystemApiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { ALL_SCOPES, generateApiKey, hashApiKey, type EcosystemScope } from '@/lib/ecosystem-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (admin.response) return admin.response;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;

    // Get keys owned by this user
    const keys = await db.query.ecosystemApiKeys.findMany({
      where: eq(ecosystemApiKeys.ownerId, userId),
      columns: {
        apiSecret: false, // Never return secret in list
        apiKey: false, // Only the hash is stored; show keyPrefix instead
        keyHash: false,
      },
    });

    return NextResponse.json({
      keys,
      count: keys.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[API Keys] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (admin.response) return admin.response;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const body = await request.json();
    const { appName, description, permissions = ['contacts.read', 'profile.read'] } = body;

    if (!appName) {
      return NextResponse.json(
        { error: 'App name is required' },
        { status: 400 }
      );
    }

    const requested: string[] = Array.isArray(permissions) ? permissions : [];
    const invalid = requested.filter((p) => !ALL_SCOPES.includes(p as EcosystemScope));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown permissions: ${invalid.join(', ')}`, allowed: ALL_SCOPES },
        { status: 400 }
      );
    }

    // Only the SHA-256 hash is stored; the plaintext key is shown exactly once.
    const { key: apiKey, hash, displayPrefix } = generateApiKey(appName);
    const apiSecret = crypto.randomBytes(32).toString('hex');

    const newKey = await db
      .insert(ecosystemApiKeys)
      .values({
        appName: String(appName).slice(0, 60),
        apiKey: hash,
        keyHash: hash,
        keyPrefix: displayPrefix,
        apiSecret: hashApiKey(apiSecret),
        ownerId: userId,
        permissions: requested,
        metadata: {
          description,
          createdBy: session.user.email,
        } as any,
      })
      .returning({
        id: ecosystemApiKeys.id,
        appName: ecosystemApiKeys.appName,
        keyPrefix: ecosystemApiKeys.keyPrefix,
        permissions: ecosystemApiKeys.permissions,
        status: ecosystemApiKeys.status,
        createdAt: ecosystemApiKeys.createdAt,
      });

    return NextResponse.json(
      {
        success: true,
        key: newKey[0],
        apiKey, // Only shown once at creation
        apiSecret, // Only shown once at creation
        warning: 'Save your API key and secret securely. You will not be able to see them again.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Keys Create] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
