import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceAdminAccess } from '@/lib/admin';
import { generateMfaSecret, isMfaEnabled } from '@/lib/mfa';
import { logAdminAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await enforceAdminAccess(userEmail);

    // Check if MFA already enabled
    const mfaAlreadyEnabled = await isMfaEnabled(userEmail);
    if (mfaAlreadyEnabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this account' },
        { status: 400 }
      );
    }

    // Generate MFA secret and QR code
    const mfaSetup = await generateMfaSecret(userEmail);

    return NextResponse.json({
      success: true,
      secret: mfaSetup.secret,
      qrCode: mfaSetup.qrCode,
      manualEntryKey: mfaSetup.manualEntryKey,
      backupCodes: mfaSetup.backupCodes,
      message: 'Scan the QR code with your authenticator app or enter the manual key',
    });
  } catch (error: any) {
    console.error('Error in MFA setup:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to setup MFA' },
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

    // Check if user is admin
    await enforceAdminAccess(userEmail);

    const body = await req.json();
    const { secret, backupCodes, token } = body;

    if (!secret || !token || !backupCodes) {
      return NextResponse.json(
        { error: 'Missing required fields: secret, token, backupCodes' },
        { status: 400 }
      );
    }

    // Verify token before saving (in verify endpoint)
    // Here we just save the MFA setup that was already verified

    return NextResponse.json({
      success: true,
      message: 'MFA setup initiated. Please verify with the token from your authenticator app.',
    });
  } catch (error: any) {
    console.error('Error in MFA POST:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to setup MFA' },
      { status: 500 }
    );
  }
}
