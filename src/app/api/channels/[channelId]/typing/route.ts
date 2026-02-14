/**
 * Typing Indicator API Endpoint
 * Stores and retrieves real-time typing status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory store for typing indicators (consider Redis for production)
const typingStore = new Map<string, Map<string, { userName: string; timestamp: number }>>();

// Clean up old typing indicators (older than 5 seconds)
setInterval(() => {
  const now = Date.now();
  typingStore.forEach((channelTypers, channelId) => {
    channelTypers.forEach((data, userId) => {
      if (now - data.timestamp > 5000) {
        channelTypers.delete(userId);
      }
    });
    if (channelTypers.size === 0) {
      typingStore.delete(channelId);
    }
  });
}, 5000);

/**
 * GET /api/channels/[channelId]/typing
 * Get users currently typing in a channel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    const channelTypers = typingStore.get(channelId) || new Map();

    const typingUsers = Array.from(channelTypers.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      timestamp: data.timestamp,
    }));

    return NextResponse.json({ typingUsers });
  } catch (error) {
    console.error('Error fetching typing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch typing status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/channels/[channelId]/typing
 * Broadcast that user is typing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    const { userId, userName } = await request.json();

    // Validate that userId matches session
    if (userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create channel typing store
    if (!typingStore.has(channelId)) {
      typingStore.set(channelId, new Map());
    }

    const channelTypers = typingStore.get(channelId)!;
    channelTypers.set(userId, {
      userName,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return NextResponse.json(
      { error: 'Failed to update typing status' },
      { status: 500 }
    );
  }
}
