import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createNexusEmailClient } from '@/lib/nexusClient';

/**
 * POST /api/nexus/sync
 * Sync contacts to Nexus Email
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || (session?.user as any)?.uid;
    const { contacts, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Nexus API key is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Contacts must be an array' },
        { status: 400 }
      );
    }

    // Create Nexus client with provided API key
    const nexusClient = createNexusEmailClient(apiKey);

    // Verify connection first
    const isConnected = await nexusClient.verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to Nexus. Check your API key.' },
        { status: 400 }
      );
    }

    // Sync contacts to Nexus
    const results = await nexusClient.batchSyncContacts(
      contacts.map((c: any) => ({
        id: c.nexusId,
        email: c.email,
        name: c.name,
        phone: c.phone,
        avatar: c.avatar,
        customData: { moswrodsId: c.id },
      }))
    );

    // Count successes and failures
    const successCount = results.filter((r) => r.status === 'synced').length;
    const failureCount = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      synced: successCount,
      failed: failureCount,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Error syncing to Nexus:', error);
    return NextResponse.json(
      { error: 'Failed to sync contacts to Nexus' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nexus/sync
 * Get sync status and history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Fetch sync history from database
    const syncHistory = [
      {
        id: 'sync-1',
        timestamp: new Date(),
        contactsCount: 5,
        successCount: 5,
        failureCount: 0,
        status: 'completed',
      },
      {
        id: 'sync-2',
        timestamp: new Date(Date.now() - 86400000),
        contactsCount: 3,
        successCount: 3,
        failureCount: 0,
        status: 'completed',
      },
    ];

    return NextResponse.json({ syncHistory });
  } catch (error) {
    console.error('Error fetching sync history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    );
  }
}
