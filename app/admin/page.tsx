
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { DashboardOverview } from '@/components/admin/dashboard-overview';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || !session.user.tenantId) {
    redirect('/unauthorized');
  }

  const tenantDb = new TenantDb(session.user.tenantId);
  const [stats, recentBookings, housekeepingTasks] = await Promise.all([
    tenantDb.getDashboardStats(),
    tenantDb.getBookings({ limit: 5 }),
    tenantDb.getHousekeepingTasks({ 
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      limit: 5 
    }),
  ]);

  return (
    <DashboardOverview
      stats={stats}
      recentBookings={recentBookings}
      housekeepingTasks={housekeepingTasks}
      user={session.user}
    />
  );
}
