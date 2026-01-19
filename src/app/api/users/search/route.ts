import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { ilike, or } from 'drizzle-orm';

// GET /api/users/search?q=<query> - Search for users by email or name
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const searchQuery = `%${query.trim()}%`;

    // Search for users by email or name, excluding the current user
    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        photoURL: users.photoURL,
        customStatus: users.customStatus,
      })
      .from(users)
      .where(
        or(
          ilike(users.email, searchQuery),
          ilike(users.name, searchQuery),
          ilike(users.displayName, searchQuery)
        )
      )
      .limit(10);

    // Filter out current user
    const filteredUsers = foundUsers.filter(u => u.id !== currentUserId);

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
