import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceAdminAccess } from '@/lib/admin';
import { generateEmailMfaCode } from '@/lib/mfa';
import { sendEmail, generateMfaEmailHtml, generateMfaEmailText } from '@/lib/email';
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

    // Generate 6-digit code
    const code = await generateEmailMfaCode(userEmail);

    // Send email with code
    await sendEmail({
      to: userEmail,
      subject: 'Moswords MFA Verification Code',
      htmlBody: generateMfaEmailHtml(code),
      textBody: generateMfaEmailText(code),
    });

    // Log the action
    await logAdminAction({
      userId,
      email: userEmail,
      action: 'mfa_email_code_sent',
      resource: 'admin_user',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error: any) {
    console.error('Error sending MFA email:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
