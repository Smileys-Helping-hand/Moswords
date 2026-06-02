/**
 * GET  /api/second-brain/contacts - Get user's contacts (for connected apps)
 * POST /api/second-brain/contacts - Sync/create contacts
 *
 * This is the shared contacts API that apps like awechat, financeplay, etc. use
 * to access the user's contact list from Second Brain (Moswords).
 *
 * Requires: Master Token Authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateMasterToken, MasterTokenError } from '@/lib/master-token';
import { db } from '@/lib/db';
import { contacts, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Validate master token
    await validateMasterToken();

    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const appName = request.headers.get('x-app-name') || 'unknown';

    // Get user's contacts
    const userContacts = await db.query.contacts.findMany({
      where: eq(contacts.userId, userId),
    });

    // Format for the app
    const formattedContacts = userContacts.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phoneNumber: c.phoneNumber,
      photoURL: c.photoURL,
      source: c.source,
      metadata: c.metadata,
    }));

    return NextResponse.json({
      contacts: formattedContacts,
      count: formattedContacts.length,
      userId,
      appName,
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error instanceof MasterTokenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('[Get Contacts] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate master token
    await validateMasterToken();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const appName = request.headers.get('x-app-name') || 'unknown';
    const body = await request.json();

    const { contacts: newContacts, action = 'sync' } = body;

    if (!Array.isArray(newContacts)) {
      return NextResponse.json(
        { error: 'Contacts must be an array' },
        { status: 400 }
      );
    }

    if (action === 'sync') {
      // Sync contacts from the app
      const syncedContacts = [];

      for (const contact of newContacts) {
        if (!contact.email || !contact.name) {
          continue; // Skip invalid contacts
        }

        // Check if contact exists
        const existing = await db.query.contacts.findFirst({
          where: eq(contacts.email, contact.email),
        });

        if (existing) {
          // Update synced apps list
          const updatedSyncedApps = [
            ...new Set([...(existing.syncedToApps || []), appName]),
          ];

          const updated = await db
            .update(contacts)
            .set({
              syncedToApps: updatedSyncedApps,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existing.id))
            .returning();

          syncedContacts.push(updated[0]);
        } else {
          // Create new contact
          const created = await db
            .insert(contacts)
            .values({
              userId,
              email: contact.email,
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              photoURL: contact.photoURL,
              source: appName,
              syncedToApps: [appName],
              metadata: contact.metadata,
            })
            .returning();

          syncedContacts.push(created[0]);
        }
      }

      return NextResponse.json(
        {
          success: true,
          action: 'sync',
          synced: syncedContacts.length,
          contacts: syncedContacts,
          message: `${syncedContacts.length} contacts synced`,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof MasterTokenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('[Sync Contacts] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
