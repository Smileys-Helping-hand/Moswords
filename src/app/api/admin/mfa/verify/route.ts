import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceAdminAccess, updateLastMfaVerified } from '@/lib/admin';
import { verifyMfaToken, saveMfaSecret } from '@/lib/mfa';
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
    const { secret, token, backupCodes, action } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing MFA token' },
        { status: 400 }
      );
    }

    // Verify TOTP token
    const verification = await verifyMfaToken(secret, token);

    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid MFA token. Please try again.' },
        { status: 400 }
      );
    }

    // If action is 'enable', save the secret
    if (action === 'enable' && secret && backupCodes) {
      await saveMfaSecret(userEmail, secret, backupCodes);

      // Log the action
      await logAdminAction({
        userId,
        email: userEmail,
        action: 'mfa_enabled',
        resource: 'admin_user',
        mfaVerified: true,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'MFA enabled successfully',
        backupCodes, // Show backup codes one more time
      });
    }

    // For other actions (like operation verification), just update last verified time
    await updateLastMfaVerified(userEmail);

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'MFA token verified successfully',
    });
  } catch (error: any) {
    console.error('Error in MFA verify:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to verify MFA token' },
      { status: 500 }
    );
  }
}
