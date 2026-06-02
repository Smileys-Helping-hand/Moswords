/**
 * Audit logging utility
 * Logs all admin actions for security and compliance
 */

import { db } from '@/lib/db';
import { auditLogs } from '@/lib/schema';

export interface AuditLogData {
  userId: string;
  email: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  mfaVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action
 */
export async function logAdminAction(data: AuditLogData): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      email: data.email.toLowerCase(),
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details || {},
      mfaVerified: data.mfaVerified ?? false,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (error) {
    // Log error but don't throw - audit logging shouldn't break the action
    console.error('Error logging admin action:', error);
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  try {
    let query = db.select().from(auditLogs);

    // Note: This is a simplified version - in production, use proper filtering
    const logs = await query;

    // Apply filters in memory for now
    let filtered = logs;

    if (options.userId) {
      filtered = filtered.filter((log) => log.userId === options.userId);
    }

    if (options.action) {
      filtered = filtered.filter((log) => log.action === options.action);
    }

    if (options.resource) {
      filtered = filtered.filter((log) => log.resource === options.resource);
    }

    if (options.startDate) {
      filtered = filtered.filter((log) => log.createdAt >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((log) => log.createdAt <= options.endDate!);
    }

    // Sort by date descending
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Apply limit and offset
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    return {
      logs: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return {
      logs: [],
      total: 0,
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
  }
}

/**
 * Get recent admin actions
 */
export async function getRecentAdminActions(limit: number = 20) {
  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy((log) => log.createdAt) // Will need proper ordering with drizzle
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('Error fetching recent actions:', error);
    return [];
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats() {
  try {
    const logs = await db.select().from(auditLogs);

    const stats = {
      totalActions: logs.length,
      actionsByType: {} as Record<string, number>,
      resourcesByType: {} as Record<string, number>,
      actionsByUser: {} as Record<string, number>,
      mfaVerifiedCount: 0,
      lastAction: logs[0] || null,
    };

    logs.forEach((log) => {
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
      stats.resourcesByType[log.resource] = (stats.resourcesByType[log.resource] || 0) + 1;
      stats.actionsByUser[log.email] = (stats.actionsByUser[log.email] || 0) + 1;
      if (log.mfaVerified) {
        stats.mfaVerifiedCount++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error calculating audit stats:', error);
    return null;
  }
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsAsCSV(): Promise<string> {
  try {
    const logs = await db.select().from(auditLogs);

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
      log.ipAddress || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw new Error('Failed to export audit logs');
  }
}
