import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceAdminAccess, updateLastMfaVerified } from '@/lib/admin';
import { verifyEmailMfaCode, enableEmailMfa } from '@/lib/mfa';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const userId = (session?.user as any)?.id;

    if (!userEmail || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await enforceAdminAccess(userEmail);

    const body = await req.json();
    const { code, action } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing verification code' },
        { status: 400 }
      );
    }

    // Verify email code
    const verification = await verifyEmailMfaCode(userEmail, code);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.message },
        { status: 400 }
      );
    }

    // If action is 'enable', save email MFA as enabled
    if (action === 'enable') {
      await enableEmailMfa(userEmail);

      // Log the action
      await logAdminAction({
        userId,
        email: userEmail,
        action: 'mfa_email_enabled',
        resource: 'admin_user',
        mfaVerified: true,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'Email MFA enabled successfully',
      });
    }

    // For other actions (like operation verification), just update last verified time
    await updateLastMfaVerified(userEmail);

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Verification code verified successfully',
    });
  } catch (error: any) {
    console.error('Error in email MFA verify:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
