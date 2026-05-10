
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SuperAdminLayout } from '@/components/super-admin/super-admin-layout';

export default async function SuperAdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized');
  }

  return <SuperAdminLayout user={session.user}>{children}</SuperAdminLayout>;
}
