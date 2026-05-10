
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'];
  if (!session.user || !allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized');
  }

  return <AdminLayout user={session.user}>{children}</AdminLayout>;
}
