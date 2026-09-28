import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friends } from '@/lib/schema';
import { authenticateApp, resolveActingUser } from '@/lib/ecosystem-auth';
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
 *   "apiKey": "nexus_...",          // or Authorization: Bearer <key>
 *   "userEmail": "user@example.com", // the user acting (must be the recipient)
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
    const { apiKey, friendshipId, action, userEmail } = body;

    // Validate request
    if (!friendshipId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: friendshipId, action' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject', 'block'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept", "reject", or "block"' },
        { status: 400 }
      );
    }

    const auth = await authenticateApp(request, 'friends.write', apiKey);
    if (auth.response) return auth.response;
    const apiKeyRecord = auth.app;

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

    // The app must say which user is acting, and that user must be party to
    // the request: only the recipient can accept/reject, either side can block.
    const acting = await resolveActingUser(request, userEmail);
    if (acting.response) return acting.response;
    const isRecipient = friendship.friendId === acting.user.id;
    const isParty = isRecipient || friendship.userId === acting.user.id;
    if (!isParty || (action !== 'block' && !isRecipient)) {
      return NextResponse.json(
        { error: 'That user cannot perform this action on this friend request' },
        { status: 403 }
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
