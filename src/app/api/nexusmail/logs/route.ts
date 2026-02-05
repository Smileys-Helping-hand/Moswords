import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { emailLogs } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/nexusmail/logs
 * Fetch email logs for the audit dashboard
 * 
 * Query params:
 * - limit: number of logs to return (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = await db
      .select()
      .from(emailLogs)
      .orderBy(desc(emailLogs.timestamp))
      .limit(Math.min(limit, 500)); // Cap at 500 for performance

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error.message },
      { status: 500 }
    );
  }
}
