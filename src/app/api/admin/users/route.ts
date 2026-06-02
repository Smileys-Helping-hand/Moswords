import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceSuperAdminAccess } from '@/lib/admin';
import { db } from '@/lib/db';
import { adminUsers, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logAdminAction } from '@/lib/audit';
import { DEFAULT_FEATURES } from '@/lib/features';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can view all admin users
    enforceSuperAdminAccess(userEmail);

    // Get all admin users
    const adminUsersList = await db
      .select({
        id: adminUsers.id,
        userId: adminUsers.userId,
        email: adminUsers.email,
        role: adminUsers.role,
        features: adminUsers.features,
        mfaEnabled: adminUsers.mfaEnabled,
        lastMfaVerified: adminUsers.lastMfaVerified,
        lastLogin: adminUsers.lastLogin,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers);

    return NextResponse.json({
      success: true,
      adminUsers: adminUsersList,
      count: adminUsersList.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const userId = (session?.user as any)?.id;

    if (!userEmail || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can create new admins
    enforceSuperAdminAccess(userEmail);

    const body = await req.json();
    const { email: newAdminEmail, role = 'admin', features } = body;

    if (!newAdminEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.email, newAdminEmail.toLowerCase()))
      .limit(1);

    if (!userExists[0]) {
      return NextResponse.json(
        { error: `User with email ${newAdminEmail} does not exist` },
        { status: 404 }
      );
    }

    // Check if already admin
    const alreadyAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, newAdminEmail.toLowerCase()))
      .limit(1);

    if (alreadyAdmin[0]) {
      return NextResponse.json(
        { error: `${newAdminEmail} is already an admin` },
        { status: 400 }
      );
    }

    // Create new admin user
    const featuresToSet = features || DEFAULT_FEATURES;

    const newAdmin = await db
      .insert(adminUsers)
      .values({
        userId: userExists[0].id,
        email: newAdminEmail.toLowerCase(),
        role,
        features: featuresToSet,
      })
      .returning();

    // Log the action
    await logAdminAction({
      userId,
      email: userEmail,
      action: 'admin_user_created',
      resource: 'admin_user',
      resourceId: newAdmin[0].id,
      details: { newAdminEmail, role, features: featuresToSet },
      mfaVerified: true,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `${newAdminEmail} has been added as an admin`,
      adminUser: newAdmin[0],
    });
  } catch (error: any) {
    console.error('Error creating admin user:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
