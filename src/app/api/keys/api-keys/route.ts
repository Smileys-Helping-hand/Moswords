import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate a secure API key
 */
function generateAPIKey(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Mask API key for display (show last 8 chars)
 */
function maskAPIKey(key: string): string {
  return `${key.substring(0, 7)}...${key.substring(key.length - 8)}`;
}

/**
 * GET /api/keys/api-keys
 * Fetch all API keys for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Fetch API keys from database for current user
    // Only return masked keys, not full keys
    const mockKeys = [
      {
        id: 'key-1',
        name: 'Nexus Integration',
        key: 'sk_hidden_for_security',
        maskedKey: 'sk_...12345678',
        createdAt: new Date('2026-05-20'),
        lastUsed: new Date('2026-05-28'),
        isActive: true,
        permissions: ['contacts:read', 'contacts:write'],
      },
    ];

    return NextResponse.json({ keys: mockKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/keys/api-keys
 * Create a new API key
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || (session?.user as any)?.uid;
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    // Generate new API key
    const apiKey = generateAPIKey();
    const keyId = `key-${Date.now()}-${Math.random()}`;

    // TODO: Save API key to database (hash it, don't store plaintext)
    const newKey = {
      id: keyId,
      name,
      key: apiKey,
      maskedKey: maskAPIKey(apiKey),
      createdAt: new Date(),
      lastUsed: null,
      isActive: true,
      permissions: ['contacts:read', 'contacts:write', 'notifications:send'],
    };

    return NextResponse.json({ key: newKey }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
