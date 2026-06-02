/**
 * Superadmin management
 * Only mraaziqp@gmail.com is the superadmin
 */

const SUPERADMIN_EMAILS = ['mraaziqp@gmail.com'];

export function isSuperAdmin(email: string): boolean {
  return SUPERADMIN_EMAILS.includes(email?.toLowerCase());
}

export function getSuperAdminEmails(): string[] {
  return [...SUPERADMIN_EMAILS];
}

export const SUPERADMIN_EMAIL = 'mraaziqp@gmail.com';
