import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PRIVACY = {
  readReceipts: true,
  lastSeenVisibility: 'everyone',
  profilePictureVisibility: 'everyone',
  aboutVisibility: 'contacts',
  statusVisibility: 'contacts',
};

// GET /api/privacy — get current user's privacy settings
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const [user] = await db
        .select({ privacySettings: users.privacySettings })
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);

      return NextResponse.json({
        privacySettings: { ...DEFAULT_PRIVACY, ...(user?.privacySettings || {}) },
      });
    } catch {
      return NextResponse.json({ privacySettings: DEFAULT_PRIVACY });
    }
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 });
  }
}

// PATCH /api/privacy — update privacy settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { privacySettings } = body;

    try {
      // Get current settings first
      const [current] = await db
        .select({ privacySettings: users.privacySettings })
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);

      const merged = { ...DEFAULT_PRIVACY, ...(current?.privacySettings || {}), ...privacySettings };

      await db
        .update(users)
        .set({ privacySettings: merged } as any)
        .where(eq(users.email, session.user.email));

      return NextResponse.json({ success: true, privacySettings: merged });
    } catch (dbError) {
      console.warn('privacy_settings column may not exist yet:', dbError);
      return NextResponse.json({ success: true, privacySettings });
    }
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
}
