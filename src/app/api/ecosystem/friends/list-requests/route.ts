import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/schema';
import { authenticateApp } from '@/lib/ecosystem-auth';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ecosystem/friends/list-requests?apiKey=...&userEmail=...
 *
 * List pending friend requests for a user via API key authentication.
 *
 * Query Params:
 * - apiKey: Ecosystem API key (nexus_, email_orca_, etc.)
 * - userEmail: Email of user to list requests for
 *
 * Response:
 * {
 *   "success": true,
 *   "requests": [
 *     {
 *       "id": "uuid",
 *       "senderEmail": "friend@example.com",
 *       "senderName": "Friend Name",
 *       "status": "pending",
 *       "createdAt": "2026-06-03T12:00:00Z"
 *     }
 *   ],
 *   "count": 5
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apiKey = searchParams.get('apiKey');
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing required query params: userEmail' },
        { status: 400 }
      );
    }

    const auth = await authenticateApp(request, 'friends.read', apiKey);
    if (auth.response) return auth.response;
    const apiKeyRecord = auth.app;

    // Get the user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${String(userEmail).trim().toLowerCase()}`)
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${userEmail}` },
        { status: 404 }
      );
    }

    // Get all pending friend requests for this user
    const requests = await db
      .select({
        id: friends.id,
        senderEmail: users.email,
        senderName: users.displayName,
        status: friends.status,
        createdAt: friends.createdAt,
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(
        eq(friends.friendId, user.id)
        // Only show pending requests received by this user
      )
      .limit(100);

    // Filter to only pending requests
    const pendingRequests = requests.filter((r) => r.status === 'pending');


    return NextResponse.json(
      {
        success: true,
        requests: pendingRequests,
        count: pendingRequests.length,
        appName: apiKeyRecord.appName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error listing friend requests via API:', error);

    return NextResponse.json(
      { error: 'Failed to list friend requests. Please try again.' },
      { status: 500 }
    );
  }
}
