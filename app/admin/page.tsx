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

  const [stats, recentBookings, housekeepingTasks, pendingTasks, roomCount, tenant, property] = await Promise.all([
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
    prisma.room.count({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, settings: true } }),
    prisma.property.findFirst({ where: { tenantId }, select: { id: true, name: true } }),
  ]);

  const settings = (tenant?.settings as any) ?? null;
  const onboardingComplete = Boolean(settings?.onboardingComplete);
  const draftMode = Boolean(settings?.draftMode);
  // Quick-setup card is offered before the manual wizard. We only show it
  // when the tenant has zero rooms AND hasn't already attempted onboarding
  // or seed — so it doesn't keep nagging owners who deliberately chose the
  // manual flow.
  const showQuickSetup = roomCount === 0 && !onboardingComplete && !settings?.seededFromHotellook;
  const showOnboarding = roomCount === 0 && !onboardingComplete;

  return (
    <DashboardOverview
      stats={stats}
      recentBookings={recentBookings}
      housekeepingTasks={housekeepingTasks}
      pendingTasks={pendingTasks}
      user={session.user}
      showOnboarding={showOnboarding}
      showQuickSetup={showQuickSetup}
      draftMode={draftMode}
      propertySubdomain={tenant?.subdomain ?? ''}
      propertyName={property?.name ?? ''}
      propertyId={property?.id ?? ''}
    />
  );
}
