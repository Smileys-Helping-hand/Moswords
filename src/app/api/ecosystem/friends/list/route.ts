import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/schema';
import { authenticateApp } from '@/lib/ecosystem-auth';
import { eq, and, or, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ecosystem/friends/list
 *
 * Get a user's friends list via API key authentication.
 * Allows Nexus, Email Orca, etc. to fetch friend data for their users.
 *
 * Request Body:
 * {
 *   "apiKey": "nexus_...",
 *   "userEmail": "user@example.com",
 *   "status": "accepted" | "pending" | "blocked" (optional, default: "accepted")
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "friends": [
 *     {
 *       "id": "friendship-id",
 *       "friend": { "id", "email", "name", "displayName", "photoURL" },
 *       "status": "accepted",
 *       "createdAt": "...",
 *       "acceptedAt": "..."
 *     }
 *   ],
 *   "pendingRequests": [...],
 *   "count": 42
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, userEmail, status = 'accepted' } = body;

    // Validate request
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail' },
        { status: 400 }
      );
    }

    if (!['accepted', 'pending', 'blocked'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "accepted", "pending", or "blocked"' },
        { status: 400 }
      );
    }

    const auth = await authenticateApp(request, 'friends.read', apiKey);
    if (auth.response) return auth.response;
    const apiKeyRecord = auth.app;

    // Get the user
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = ${String(userEmail).trim().toLowerCase()}`)
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${userEmail}` },
        { status: 404 }
      );
    }

    // Get friends where user is the requester (outgoing)
    const userFriends = await db
      .select({
        id: friends.id,
        userId: friends.userId,
        friendId: friends.friendId,
        status: friends.status,
        createdAt: friends.createdAt,
        acceptedAt: friends.acceptedAt,
        friend: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
        },
      })
      .from(friends)
      .leftJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, user.id), eq(friends.status, status)));

    // Get friends where user is the recipient (incoming accepted)
    const reverseFriends = await db
      .select({
        id: friends.id,
        userId: friends.userId,
        friendId: friends.friendId,
        status: friends.status,
        createdAt: friends.createdAt,
        acceptedAt: friends.acceptedAt,
        friend: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
        },
      })
      .from(friends)
      .leftJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, user.id), eq(friends.status, status)));

    // Merge and dedupe - for reverse friends, swap to present as if user is the owner
    const allFriends = [
      ...userFriends,
      ...reverseFriends.map(rf => ({
        ...rf,
        userId: rf.friendId,
        friendId: rf.userId,
      }))
    ];

    const uniqueByFriendId = new Map<string, (typeof userFriends)[number]>();
    for (const row of allFriends) {
      const key = row.friend?.id ?? row.friendId;
      if (!uniqueByFriendId.has(key)) uniqueByFriendId.set(key, row);
    }

    const friendsList = Array.from(uniqueByFriendId.values());

    // Get pending requests sent TO this user (incoming)
    const pendingRequests = status === 'pending'
      ? await db
          .select({
            id: friends.id,
            userId: friends.userId,
            friendId: friends.friendId,
            status: friends.status,
            createdAt: friends.createdAt,
            requester: {
              id: users.id,
              email: users.email,
              name: users.name,
              displayName: users.displayName,
              photoURL: users.photoURL,
              customStatus: users.customStatus,
            },
          })
          .from(friends)
          .leftJoin(users, eq(friends.userId, users.id))
          .where(and(eq(friends.friendId, user.id), eq(friends.status, 'pending')))
      : [];


    return NextResponse.json(
      {
        success: true,
        userEmail,
        status,
        friends: friendsList,
        pendingRequests,
        count: friendsList.length,
        appName: apiKeyRecord.appName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching friends via API:', error);

    return NextResponse.json(
      { error: 'Failed to fetch friends. Please try again.' },
      { status: 500 }
    );
  }
}
