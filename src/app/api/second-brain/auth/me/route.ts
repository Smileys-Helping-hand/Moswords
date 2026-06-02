/**
 * GET /api/second-brain/auth/me
 *
 * Master endpoint for all connected apps to verify authentication
 * and get the authenticated user's profile.
 *
 * Authorization: Bearer <SECOND_BRAIN_API_KEY>
 *
 * Response:
 * {
 *   uid: string,
 *   email: string,
 *   displayName: string | null,
 *   photoURL: string | null,
 *   role: "admin" | "user",
 *   authenticated: true,
 *   timestamp: number
 * }
 *
 * Errors:
 * 401: Unauthorized - Invalid or missing token
 * 403: Forbidden - Token valid but user deactivated
 * 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateMasterToken, MasterTokenError } from '@/lib/master-token';

export async function GET(request: NextRequest) {
  try {
    // Validate master token first
    const token = await validateMasterToken();

    // Get the actual user session from the database
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No session found', authenticated: false },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Return user profile in standardized format
    return NextResponse.json(
      {
        uid: user.id || user.uid,
        email: user.email,
        displayName: user.displayName || user.name || null,
        photoURL: user.photoURL || user.image || null,
        role: user.role || 'user',
        authenticated: true,
        timestamp: Date.now(),
        // Include connected apps info if available
        connectedApps: user.connectedApps || [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Token-Valid': 'true',
        },
      }
    );
  } catch (error) {
    if (error instanceof MasterTokenError) {
      return NextResponse.json(
        {
          error: error.message,
          authenticated: false,
          code: 'AUTH_FAILED',
        },
        { status: error.status }
      );
    }

    console.error('[Second Brain Auth] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        authenticated: false,
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
