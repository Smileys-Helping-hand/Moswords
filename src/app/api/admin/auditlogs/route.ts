import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceAdminAccess, hasFeature } from '@/lib/admin';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/schema';
import { desc, limit, offset } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin with audit log viewing permission
    await enforceAdminAccess(userEmail);
    const canViewLogs = await hasFeature(userEmail, 'can_view_audit_logs');

    if (!canViewLogs) {
      return NextResponse.json(
        { error: 'You do not have permission to view audit logs' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering and pagination
    const searchParams = req.nextUrl.searchParams;
    const pageSize = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const pageNumber = parseInt(searchParams.get('offset') || '0');
    const filterAction = searchParams.get('action');
    const filterResource = searchParams.get('resource');
    const filterEmail = searchParams.get('email');

    // Build query
    let query = db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(pageNumber * pageSize);

    // Execute query
    const logs = await query;

    // Filter in-memory if needed (simple filtering)
    let filtered = logs;

    if (filterAction) {
      filtered = filtered.filter((log) => log.action === filterAction);
    }

    if (filterResource) {
      filtered = filtered.filter((log) => log.resource === filterResource);
    }

    if (filterEmail) {
      filtered = filtered.filter((log) =>
        log.email.toLowerCase().includes(filterEmail.toLowerCase())
      );
    }

    // Get total count for pagination
    const allLogs = await db.select().from(auditLogs);
    const total = allLogs.length;

    return NextResponse.json({
      success: true,
      logs: filtered,
      pagination: {
        limit: pageSize,
        offset: pageNumber * pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        currentPage: pageNumber + 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * Export audit logs as CSV
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin with audit log viewing permission
    await enforceAdminAccess(userEmail);
    const canViewLogs = await hasFeature(userEmail, 'can_view_audit_logs');

    if (!canViewLogs) {
      return NextResponse.json(
        { error: 'You do not have permission to view audit logs' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action !== 'export') {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: export' },
        { status: 400 }
      );
    }

    // Get all audit logs
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

    // Convert to CSV
    const headers = [
      'Timestamp',
      'User Email',
      'Action',
      'Resource',
      'Resource ID',
      'MFA Verified',
      'IP Address',
    ];

    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.email,
      log.action,
      log.resource,
      log.resourceId || '',
      log.mfaVerified ? 'Yes' : 'No',
      log.ipAddress || 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting audit logs:', error);

    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
