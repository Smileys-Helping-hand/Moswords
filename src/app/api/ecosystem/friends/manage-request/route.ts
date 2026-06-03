import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friends, ecosystemApiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ecosystem/friends/manage-request
 *
 * Accept or reject a friend request via API key authentication.
 *
 * Request Body:
 * {
 *   "apiKey": "nexus_...",
 *   "friendshipId": "uuid",
 *   "action": "accept" | "reject" | "block"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "friendship": { id, userId, friendId, status, createdAt, acceptedAt },
 *   "message": "Friend request accepted"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, friendshipId, action } = body;

    // Validate request
    if (!apiKey || !friendshipId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, friendshipId, action' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject', 'block'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept", "reject", or "block"' },
        { status: 400 }
      );
    }

    // Verify API key
    const [apiKeyRecord] = await db
      .select({
        id: ecosystemApiKeys.id,
        appName: ecosystemApiKeys.appName,
        status: ecosystemApiKeys.status,
      })
      .from(ecosystemApiKeys)
      .where(eq(ecosystemApiKeys.apiKey, apiKey))
      .limit(1);

    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (apiKeyRecord.status !== 'active') {
      return NextResponse.json(
        { error: `API key is ${apiKeyRecord.status}` },
        { status: 403 }
      );
    }

    // Get the friendship request
    const [friendship] = await db
      .select()
      .from(friends)
      .where(eq(friends.id, friendshipId))
      .limit(1);

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friendship request not found' },
        { status: 404 }
      );
    }

    // Determine new status and update data
    let newStatus = 'pending';
    let updateData: any = {};

    if (action === 'accept') {
      if (friendship.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot accept friendship with status "${friendship.status}"` },
          { status: 400 }
        );
      }
      newStatus = 'accepted';
      updateData = {
        status: 'accepted',
        acceptedAt: new Date(),
      };
    } else if (action === 'reject') {
      if (friendship.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot reject friendship with status "${friendship.status}"` },
          { status: 400 }
        );
      }
      newStatus = 'rejected';
      updateData = { status: 'rejected' };
    } else if (action === 'block') {
      newStatus = 'blocked';
      updateData = { status: 'blocked' };
    }

    // Update the friendship
    const updated = await db
      .update(friends)
      .set(updateData)
      .where(eq(friends.id, friendshipId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update friendship' },
        { status: 500 }
      );
    }

    const [updatedFriendship] = updated;

    // Update API key last used timestamp
    await db
      .update(ecosystemApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(ecosystemApiKeys.id, apiKeyRecord.id));

    return NextResponse.json(
      {
        success: true,
        friendship: updatedFriendship,
        message: `Friend request ${action}ed successfully`,
        appName: apiKeyRecord.appName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error managing friend request via API:', error);

    return NextResponse.json(
      { error: 'Failed to manage friend request. Please try again.' },
      { status: 500 }
    );
  }
}
