import { NextResponse } from 'next/server';
import { requireAdmin } from './session';
import { isSuperAdmin } from './admin';
import { logAdminAction } from './audit';

export interface AdminContext {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  audit: (action: string, targetId: string, details?: Record<string, unknown>) => Promise<void>;
}

/** requireAdmin + who the admin is + an audit-log shortcut. */
export async function adminContext(): Promise<{ admin: AdminContext; response?: undefined } | { admin?: undefined; response: NextResponse }> {
  const auth = await requireAdmin();
  if (auth.response) return { response: auth.response };
  const email = auth.user.email ?? '';
  return {
    admin: {
      id: auth.user.id,
      email,
      isSuperAdmin: isSuperAdmin(email),
      audit: (action, targetId, details) =>
        logAdminAction({ userId: auth.user.id, email, action, resource: 'user', resourceId: targetId, details }),
    },
  };
}
