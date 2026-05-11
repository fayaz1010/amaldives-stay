import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

/**
 * Call at the top of server components or API routes that require TENANT_ADMIN (owner) access.
 * Redirects to /unauthorized if the session user is not TENANT_ADMIN or SUPER_ADMIN.
 * Returns the session if access is allowed.
 */
export async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/signin');
  if (!['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/unauthorized');
  }
  return session;
}

/**
 * Same check but returns a boolean — use in API routes where you want to return 403 instead of redirect.
 */
export function isOwner(session: any): boolean {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '');
}
