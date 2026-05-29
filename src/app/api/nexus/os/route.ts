import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createNexusOSClient } from '@/lib/nexusClient';

/**
 * POST /api/nexus/os
 * Connect or update Nexus OS integration
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || (session?.user as any)?.uid;
    const { action, apiKey, profileData, settings } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Nexus OS API key is required' },
        { status: 400 }
      );
    }

    const nexusOSClient = createNexusOSClient(apiKey);

    // Verify connection first
    const isConnected = await nexusOSClient.verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to Nexus OS. Check your API key.' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'getProfile':
        result = await nexusOSClient.getUserProfile(userId);
        break;

      case 'updateProfile':
        result = await nexusOSClient.updateUserProfile(userId, profileData || {});
        break;

      case 'getSettings':
        result = await nexusOSClient.getUserSettings(userId);
        break;

      case 'updateSettings':
        result = await nexusOSClient.updateUserSettings(userId, settings || {});
        break;

      case 'getConnectedApps':
        result = await nexusOSClient.getConnectedApps(userId);
        break;

      case 'connectApp':
        // TODO: Implement app connection flow
        result = { error: 'App connection not yet implemented' };
        break;

      case 'getActivity':
        result = await nexusOSClient.getActivityLogs(userId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error interacting with Nexus OS:', error);
    return NextResponse.json(
      { error: 'Failed to interact with Nexus OS' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nexus/os
 * Get Nexus OS integration status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !(session?.user as any)?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Get integration status from database
    const status = {
      isConnected: false,
      connectedApps: [],
      lastSync: null,
      permissions: [],
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching Nexus OS status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Nexus OS status' },
      { status: 500 }
    );
  }
}
