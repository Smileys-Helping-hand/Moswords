import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { registeredApps } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/nexusmail/apps
 * Fetch all registered apps for the dashboard
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apps = await db
      .select()
      .from(registeredApps)
      .orderBy(registeredApps.createdAt);

    return NextResponse.json({ apps }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch apps', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nexusmail/apps
 * Register a new app and generate an API key
 * 
 * Request Body:
 * {
 *   "name": "My App Name"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'App name is required' },
        { status: 400 }
      );
    }

    // Generate a secure API key
    const apiKey = `nxm_${randomBytes(32).toString('hex')}`;

    // Insert the new app
    const [newApp] = await db
      .insert(registeredApps)
      .values({
        name: name.trim(),
        apiKey,
        status: 'active',
        emailsSent: 0,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        app: newApp,
        message: 'App registered successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering app:', error);
    return NextResponse.json(
      { error: 'Failed to register app', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/nexusmail/apps
 * Update an app's status
 * 
 * Request Body:
 * {
 *   "appId": "uuid",
 *   "status": "active" | "suspended" | "inactive"
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appId, status } = await request.json();

    if (!appId || !status) {
      return NextResponse.json(
        { error: 'appId and status are required' },
        { status: 400 }
      );
    }

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, suspended, or inactive' },
        { status: 400 }
      );
    }

    const [updatedApp] = await db
      .update(registeredApps)
      .set({ status })
      .where(eq(registeredApps.id, appId))
      .returning();

    if (!updatedApp) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        app: updatedApp,
        message: `App status updated to ${status}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating app:', error);
    return NextResponse.json(
      { error: 'Failed to update app', details: error.message },
      { status: 500 }
    );
  }
}
