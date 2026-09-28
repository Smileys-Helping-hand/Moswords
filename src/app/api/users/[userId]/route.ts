import { NextRequest, NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/schema';
import { requireUser } from '@/lib/session';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[userId] — another user's public profile.
 * Email is only shown to accepted friends; last-seen follows the user's
 * privacy setting (everyone / contacts / nobody).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const { userId } = await context.params;
  if (!isUuid(userId)) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        photoURL: users.photoURL,
        customStatus: users.customStatus,
        lastSeen: users.lastSeen,
        privacy: users.privacySettings,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSelf = userId === me;
    const [friendship] = isSelf
      ? []
      : await db
          .select({ status: friends.status })
          .from(friends)
          .where(
            or(
              and(eq(friends.userId, me), eq(friends.friendId, userId)),
              and(eq(friends.userId, userId), eq(friends.friendId, me)),
            ),
          )
          .limit(1);
    const isFriend = isSelf || friendship?.status === 'accepted';

    const visibility = user.privacy?.lastSeenVisibility ?? 'everyone';
    const showLastSeen = isSelf || visibility === 'everyone' || (visibility === 'contacts' && isFriend);

    const { privacy: _privacy, ...profile } = user;
    return NextResponse.json({
      user: {
        ...profile,
        email: isFriend ? user.email : null,
        lastSeen: showLastSeen ? user.lastSeen : null,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
