import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/schema';
import { authenticateApp } from '@/lib/ecosystem-auth';
import { SITE_URL } from '@/lib/site';
import { eq, or, and, sql } from 'drizzle-orm';
import { sendEmail, generateFriendRequestEmailHtml, generateFriendRequestEmailText } from '@/lib/email';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ecosystem/friends/send-request
 *
 * Allow ecosystem apps (Nexus, Email Orca, etc.) to send friend requests
 * on behalf of their users using API key authentication.
 *
 * Request Body:
 * {
 *   "apiKey": "nexus_...",
 *   "senderEmail": "user@example.com",  // Email of user sending the request
 *   "targetEmail": "friend@example.com"  // Email of user to befriend
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "friendship": { id, userId, friendId, status, createdAt },
 *   "message": "Friend request sent successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, senderEmail, targetEmail } = body;

    // Validate request
    if (!senderEmail || !targetEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: senderEmail, targetEmail' },
        { status: 400 }
      );
    }

    if (senderEmail === targetEmail) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    const auth = await authenticateApp(request, 'friends.write', apiKey);
    if (auth.response) return auth.response;
    const apiKeyRecord = auth.app;

    // Get sender user
    const [senderUser] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(sql`lower(${users.email}) = ${String(senderEmail).trim().toLowerCase()}`)
      .limit(1);

    if (!senderUser) {
      return NextResponse.json(
        { error: `Sender user not found: ${senderEmail}` },
        { status: 404 }
      );
    }

    // Get target user
    const [targetUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = ${String(targetEmail).trim().toLowerCase()}`)
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: `Target user not found: ${targetEmail}` },
        { status: 404 }
      );
    }

    // Check if friendship already exists
    const existingFriendship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, senderUser.id), eq(friends.friendId, targetUser.id)),
          and(eq(friends.userId, targetUser.id), eq(friends.friendId, senderUser.id))
        )
      )
      .limit(1);

    if (existingFriendship.length > 0) {
      const existing = existingFriendship[0];
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'Friend request already pending between these users' },
          { status: 400 }
        );
      } else if (existing.status === 'accepted') {
        return NextResponse.json(
          { error: 'Users are already friends' },
          { status: 400 }
        );
      } else if (existing.status === 'blocked') {
        return NextResponse.json(
          { error: 'Friend request blocked by user' },
          { status: 400 }
        );
      }
    }

    // Create friend request
    const inserted = await db
      .insert(friends)
      .values({
        userId: senderUser.id,
        friendId: targetUser.id,
        status: 'pending',
      })
      .returning();

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create friend request' },
        { status: 500 }
      );
    }

    const [friendship] = inserted;

    // Send email notification to recipient
    try {
      await sendEmail({
        to: targetUser.email,
        subject: `${senderUser.displayName || senderEmail} sent you a friend request from ${apiKeyRecord.appName}`,
        htmlBody: generateFriendRequestEmailHtml({
          senderName: senderUser.displayName || senderEmail,
          senderEmail: senderUser.email,
          appName: apiKeyRecord.appName,
          friendshipId: friendship.id,
          // Requests are answered in the app (signed in), never via a bare link.
          acceptLink: `${SITE_URL}/people?tab=requests`,
          declineLink: `${SITE_URL}/people?tab=requests`,
        }),
        textBody: generateFriendRequestEmailText({
          senderName: senderUser.displayName || senderEmail,
          appName: apiKeyRecord.appName,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send friend request email:', emailError);
      // Don't fail the request if email fails - friendship was created
    }


    return NextResponse.json(
      {
        success: true,
        friendship,
        message: `Friend request sent from ${senderEmail} to ${targetEmail}. Email notification sent.`,
        appName: apiKeyRecord.appName,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error sending friend request via API:', error);

    if (error?.code === '23505' || error?.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'Friend request already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send friend request. Please try again.' },
      { status: 500 }
    );
  }
}
