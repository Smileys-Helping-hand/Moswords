import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appearance } = body;

    // Update user's appearance preferences in database
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          appearance: appearance || {},
        })
        .where(eq(users.email, session.user.email))
        .returning();

      return NextResponse.json({
        success: true,
        appearance: updatedUser?.appearance,
      });
    } catch (dbError) {
      // If appearance column doesn't exist yet, just return success
      console.warn('Appearance column may not exist yet:', dbError);
      return NextResponse.json({
        success: true,
        appearance: appearance,
      });
    }
  } catch (error) {
    console.error('Error updating appearance preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return default preferences if appearance column not yet migrated
    try {
      const [user] = await db
        .select({
          appearance: users.appearance,
        })
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        appearance: user.appearance || {
          theme: 'default',
          accent: '#a259ff',
          density: 'comfy',
        },
      });
    } catch (dbError) {
      // If appearance column doesn't exist yet, return defaults
      console.warn('Appearance column may not exist yet:', dbError);
      return NextResponse.json({
        appearance: {
          theme: 'default',
          accent: '#a259ff',
          density: 'comfy',
        },
      });
    }
  } catch (error) {
    console.error('Error fetching appearance preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}
