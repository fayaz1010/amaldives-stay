import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TenantDb } from '@/lib/db';
import { getActiveProperty } from '@/lib/active-property';
import { DashboardOverview } from '@/components/admin/dashboard-overview';
import { isStripeConfigured } from '@/lib/stripe';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/auth/signin');
  if (!session.user?.tenantId) {
    redirect(session.user?.role === 'TENANT_ADMIN' ? '/onboarding' : '/unauthorized');
  }

  const tenantId = session.user.tenantId;
  // Active property scopes the whole dashboard for multi-property operators.
  const property = await getActiveProperty(tenantId);
  const activePropertyId = property?.id;
  const tenantDb = new TenantDb(tenantId, activePropertyId);

  const [stats, recentBookings, housekeepingTasks, pendingTasks, roomCount, tenant] = await Promise.all([
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
    prisma.room.count({ where: { tenantId, ...(activePropertyId ? { propertyId: activePropertyId } : {}) } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, settings: true, status: true, stripeSubscriptionId: true } }),
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

  // TRIAL without a subscription = the owner hasn't saved a card yet.
  const needsTrialSetup = tenant?.status === 'TRIAL' && !tenant?.stripeSubscriptionId;

  return (
    <>
    {needsTrialSetup && (
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Start your 30-day free trial of the Growth plan (US$19/month after the trial). Your card is
          saved with Stripe and not charged during the trial.
        </span>
        <Link
          href="/admin/settings/billing"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-cyan-600 px-3 py-1.5 font-medium text-white hover:bg-cyan-700"
        >
          Start free trial
        </Link>
      </div>
    )}
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
      stripePlatformConfigured={isStripeConfigured()}
      tenantSettings={tenant?.settings}
      otaIngestDomain={process.env.OTA_INGEST_DOMAIN ?? null}
    />
    </>
  );
}
