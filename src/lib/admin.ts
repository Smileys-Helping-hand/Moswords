/**
 * Admin access control utilities
 * Handles superadmin verification and admin access enforcement
 */

import { db } from '@/lib/db';
import { adminUsers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const SUPERADMIN_EMAIL = 'mraaziqp@gmail.com';

export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminError';
  }
}

/**
 * Check if user email is superadmin
 */
export function isSuperAdmin(email?: string): boolean {
  return email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}

/**
 * Check if user is in admin users table
 */
export async function isAdmin(email?: string): Promise<boolean> {
  if (!email) return false;

  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    return admin.length > 0;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Enforce admin access - throw error if user is not admin
 */
export async function enforceAdminAccess(email?: string): Promise<void> {
  if (!email) {
    throw new AdminError('User not authenticated');
  }

  const isUserAdmin = await isAdmin(email);
  if (!isUserAdmin) {
    throw new AdminError(`Access denied. User ${email} is not an admin.`);
  }
}

/**
 * Enforce superadmin access - throw error if user is not superadmin
 */
export function enforceSuperAdminAccess(email?: string): void {
  if (!email) {
    throw new AdminError('User not authenticated');
  }

  if (!isSuperAdmin(email)) {
    throw new AdminError(`Access denied. Only superadmin can perform this action.`);
  }
}

/**
 * Get admin user record
 */
export async function getAdminUser(email: string) {
  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    return admin[0] || null;
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return null;
  }
}

/**
 * Check if admin has specific feature enabled
 */
export async function hasFeature(email: string, feature: string): Promise<boolean> {
  // Superadmin always has all features
  if (isSuperAdmin(email)) {
    return true;
  }

  const admin = await getAdminUser(email);
  if (!admin) {
    return false;
  }

  return (admin.features as string[]).includes(feature);
}

/**
 * Enforce specific feature access
 */
export async function enforceFeature(email: string, feature: string): Promise<void> {
  const hasAccess = await hasFeature(email, feature);
  if (!hasAccess) {
    throw new AdminError(
      `User does not have permission to access feature: ${feature}`
    );
  }
}

/**
 * Initialize superadmin if doesn't exist
 */
export async function initializeSuperAdmin(userId: string, email: string): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, SUPERADMIN_EMAIL.toLowerCase()))
      .limit(1);

    if (existing.length === 0 && isSuperAdmin(email)) {
      await db.insert(adminUsers).values({
        userId,
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
        features: [
          'can_manage_api_keys',
          'can_manage_users',
          'can_view_audit_logs',
          'can_configure_subdomain',
          'can_manage_contacts',
        ],
      });
    }
  } catch (error) {
    console.error('Error initializing superadmin:', error);
  }
}

/**
 * Update admin features
 */
export async function updateAdminFeatures(
  email: string,
  features: string[]
): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({ features })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error updating admin features:', error);
    throw new AdminError('Failed to update admin features');
  }
}

/**
 * Update last MFA verified time
 */
export async function updateLastMfaVerified(email: string): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({ lastMfaVerified: new Date() })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error updating MFA time:', error);
  }
}

/**
 * Update last login time
 */
export async function updateLastLogin(email: string): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}
