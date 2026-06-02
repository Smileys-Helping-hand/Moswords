import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceSuperAdminAccess } from '@/lib/admin';
import { db } from '@/lib/db';
import { adminUsers } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logAdminAction } from '@/lib/audit';
import { validateFeatures } from '@/lib/features';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const userId = (session?.user as any)?.id;

    if (!userEmail || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can update features
    enforceSuperAdminAccess(userEmail);

    const targetEmail = decodeURIComponent(params.email).toLowerCase();
    const body = await req.json();
    const { features } = body;

    if (!Array.isArray(features)) {
      return NextResponse.json(
        { error: 'Features must be an array' },
        { status: 400 }
      );
    }

    // Validate features
    const validatedFeatures = validateFeatures(features);

    // Check if admin exists
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, targetEmail))
      .limit(1);

    if (!admin[0]) {
      return NextResponse.json(
        { error: `Admin with email ${targetEmail} not found` },
        { status: 404 }
      );
    }

    // Update features
    const oldFeatures = admin[0].features;
    const updated = await db
      .update(adminUsers)
      .set({ features: validatedFeatures })
      .where(eq(adminUsers.email, targetEmail))
      .returning();

    // Log the action
    await logAdminAction({
      userId,
      email: userEmail,
      action: 'admin_features_updated',
      resource: 'admin_user',
      resourceId: admin[0].id,
      details: {
        targetEmail,
        oldFeatures,
        newFeatures: validatedFeatures,
      },
      mfaVerified: true,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Features updated for ${targetEmail}`,
      adminUser: updated[0],
    });
  } catch (error: any) {
    console.error('Error updating admin features:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to update admin features' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const userId = (session?.user as any)?.id;

    if (!userEmail || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can revoke admin status
    enforceSuperAdminAccess(userEmail);

    const targetEmail = decodeURIComponent(params.email).toLowerCase();

    // Cannot revoke superadmin (mraaziqp@gmail.com)
    if (targetEmail === 'mraaziqp@gmail.com') {
      return NextResponse.json(
        { error: 'Cannot revoke superadmin access' },
        { status: 400 }
      );
    }

    // Check if admin exists
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, targetEmail))
      .limit(1);

    if (!admin[0]) {
      return NextResponse.json(
        { error: `Admin with email ${targetEmail} not found` },
        { status: 404 }
      );
    }

    // Delete admin user
    await db.delete(adminUsers).where(eq(adminUsers.email, targetEmail));

    // Log the action
    await logAdminAction({
      userId,
      email: userEmail,
      action: 'admin_user_revoked',
      resource: 'admin_user',
      resourceId: admin[0].id,
      details: {
        targetEmail,
        role: admin[0].role,
      },
      mfaVerified: true,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Admin access revoked for ${targetEmail}`,
    });
  } catch (error: any) {
    console.error('Error revoking admin access:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to revoke admin access' },
      { status: 500 }
    );
  }
}
