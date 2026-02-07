import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userProfiles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        photoURL: users.photoURL,
        customStatus: users.customStatus,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to get profile, but don't fail if table doesn't exist
    let profile = null;
    try {
      const profiles = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId));
      profile = profiles[0] || null;
    } catch (profileError) {
      // userProfiles table might not exist in production yet
      console.warn('Could not fetch user profile:', profileError);
    }

    return NextResponse.json({ user, profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    
    const {
      displayName,
      customStatus,
      photoURL,
      bio,
      location,
      website,
      banner,
      pronouns,
      themePreference,
      currentPassword,
      newPassword,
    } = body;

    // Update users table
    const userUpdates: any = {};
    if (displayName !== undefined) userUpdates.displayName = displayName;
    if (customStatus !== undefined) userUpdates.customStatus = customStatus;
    if (photoURL !== undefined) userUpdates.photoURL = photoURL;
    if (themePreference !== undefined) userUpdates.themePreference = themePreference;

    // Handle password change
    if (currentPassword && newPassword) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user.password) {
        return NextResponse.json(
          { error: 'No password set for this account' },
          { status: 400 }
        );
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      userUpdates.password = hashedPassword;
    }

    if (Object.keys(userUpdates).length > 0) {
      await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, userId));
    }

    // Update or create profile
    const profileUpdates: any = {};
    if (bio !== undefined) profileUpdates.bio = bio;
    if (location !== undefined) profileUpdates.location = location;
    if (website !== undefined) profileUpdates.website = website;
    if (banner !== undefined) profileUpdates.banner = banner;
    if (pronouns !== undefined) profileUpdates.pronouns = pronouns;
    profileUpdates.updatedAt = new Date();

    if (Object.keys(profileUpdates).length > 0) {
      const [existingProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId));

      if (existingProfile) {
        await db
          .update(userProfiles)
          .set(profileUpdates)
          .where(eq(userProfiles.userId, userId));
      } else {
        await db
          .insert(userProfiles)
          .values({
            userId,
            ...profileUpdates,
          });
      }
    }

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
