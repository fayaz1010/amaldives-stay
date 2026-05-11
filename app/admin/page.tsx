import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TenantDb } from '@/lib/db';
import { DashboardOverview } from '@/components/admin/dashboard-overview';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/auth/signin');
  if (!session.user?.tenantId) redirect('/unauthorized');

  const tenantId = session.user.tenantId;
  const tenantDb = new TenantDb(tenantId);

  const [stats, recentBookings, housekeepingTasks, pendingTasks] = await Promise.all([
    tenantDb.getDashboardStats(),
    tenantDb.getBookings({ limit: 5 }),
    tenantDb.getHousekeepingTasks({
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      limit: 5,
    }),
    prisma.staffTask.findMany({
      where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 5,
    }),
  ]);

  return (
    <DashboardOverview
      stats={stats}
      recentBookings={recentBookings}
      housekeepingTasks={housekeepingTasks}
      pendingTasks={pendingTasks}
      user={session.user}
    />
  );
}
