/**
 * GET  /api/ecosystem/keys - List all API keys (admin only)
 * POST /api/ecosystem/keys - Create a new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ecosystemApiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
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

    // Generate secure API key and secret
    const apiKey = `ek_${crypto.randomBytes(24).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');

    // Create the key
    const newKey = await db
      .insert(ecosystemApiKeys)
      .values({
        appName,
        apiKey,
        apiSecret,
        ownerId: userId,
        permissions,
        metadata: {
          description,
          createdBy: session.user.email,
        },
      })
      .returning();

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
