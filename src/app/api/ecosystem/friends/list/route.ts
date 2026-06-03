import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friends, users, ecosystemApiKeys } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';

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
    if (!apiKey || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, userEmail' },
        { status: 400 }
      );
    }

    if (!['accepted', 'pending', 'blocked'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "accepted", "pending", or "blocked"' },
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

    // Get the user
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, userEmail.toLowerCase()))
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

    // Update API key last used timestamp
    await db
      .update(ecosystemApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(ecosystemApiKeys.id, apiKeyRecord.id));

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
