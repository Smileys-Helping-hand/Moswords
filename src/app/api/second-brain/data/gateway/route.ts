/**
 * POST /api/second-brain/data/gateway
 *
 * Universal data gateway for all connected apps
 * Acts as a proxy to fetch data from the Second Brain
 *
 * Authorization: Bearer <SECOND_BRAIN_API_KEY>
 *
 * Request body:
 * {
 *   action: "get" | "set" | "list" | "delete",
 *   resource: "users" | "conversations" | "messages" | "preferences" | "data",
 *   resourceId?: string,
 *   filter?: Record<string, any>,
 *   data?: any,
 *   scope?: "private" | "shared" // private = user only, shared = all connected apps
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateMasterToken, MasterTokenError } from '@/lib/master-token';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Validate master token
    const token = await validateMasterToken();

    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const { action, resource, resourceId, filter, data: payload, scope = 'private' } = await request.json();

    // Validate request
    if (!action || !resource) {
      return NextResponse.json(
        { error: 'Missing action or resource' },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'get':
        return handleGet(userId, resource, resourceId, scope);

      case 'set':
        return handleSet(userId, resource, resourceId, payload, scope);

      case 'list':
        return handleList(userId, resource, filter, scope);

      case 'delete':
        return handleDelete(userId, resource, resourceId, scope);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof MasterTokenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('[Second Brain Gateway] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGet(userId: string, resource: string, resourceId?: string, scope: string = 'private') {
  // Implementation varies by resource type
  // This is a template - expand based on your needs

  switch (resource) {
    case 'profile':
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      return NextResponse.json({ data: user || null });

    default:
      return NextResponse.json(
        { error: `Unknown resource: ${resource}` },
        { status: 404 }
      );
  }
}

async function handleSet(userId: string, resource: string, resourceId: string | undefined, payload: any, scope: string = 'private') {
  // Implementation varies by resource type
  console.log(`[Data Gateway] SET ${resource}:${resourceId} by ${userId}`, { scope, payload });

  return NextResponse.json({
    success: true,
    resource,
    action: 'set',
    timestamp: Date.now(),
  });
}

async function handleList(userId: string, resource: string, filter: Record<string, any> | undefined, scope: string = 'private') {
  // Implementation varies by resource type
  console.log(`[Data Gateway] LIST ${resource} by ${userId}`, { scope, filter });

  return NextResponse.json({
    data: [],
    resource,
    action: 'list',
    count: 0,
  });
}

async function handleDelete(userId: string, resource: string, resourceId: string | undefined, scope: string = 'private') {
  // Implementation varies by resource type
  console.log(`[Data Gateway] DELETE ${resource}:${resourceId} by ${userId}`, { scope });

  return NextResponse.json({
    success: true,
    resource,
    action: 'delete',
    timestamp: Date.now(),
  });
}
