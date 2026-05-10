import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ArrivalsPageClient } from '@/components/admin/arrivals-page-client';

export const dynamic = 'force-dynamic';

export default async function ArrivalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const DEPARTURE_INCLUDE = {
    booking: {
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, number: true, name: true } },
      },
    },
    transportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, schedule: true } },
    jettyTransportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, capacity: true } },
  } as const;

  // All active arrival records
  const arrivals = await prisma.arrivalRecord.findMany({
    where: {
      tenantId,
      OR: [
        { status: { not: 'CHECKED_IN' } },
        { status: 'CHECKED_IN', checkedInAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
    include: {
      booking: {
        include: {
          guest: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, number: true, name: true } },
        },
      },
      pickupStaff: { select: { id: true, name: true } },
      transportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, schedule: true } },
      jettyTransportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, capacity: true } },
    },
    orderBy: { scheduledArrival: 'asc' },
  });

  // All departure records (active + recently departed within 24h)
  const departureRecords = await prisma.departureRecord.findMany({
    where: {
      tenantId,
      OR: [
        { status: { not: 'DEPARTED' } },
        { status: 'DEPARTED', boardedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
    include: DEPARTURE_INCLUDE,
    orderBy: { scheduledDeparture: 'asc' },
  });

  // Staff
  const staff = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'] },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Tenant settings (for default transport plans)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const defaultPlans = (tenant?.settings as any)?.defaultPlans ?? {};

  const serialisedArrivals = arrivals.map((a) => ({
    ...a,
    scheduledArrival: a.scheduledArrival?.toISOString() ?? null,
    departedAt: a.departedAt?.toISOString() ?? null,
    eta: a.eta?.toISOString() ?? null,
    arrivedJettyAt: a.arrivedJettyAt?.toISOString() ?? null,
    arrivedPropertyAt: a.arrivedPropertyAt?.toISOString() ?? null,
    checkedInAt: a.checkedInAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    booking: {
      ...a.booking,
      checkInDate: a.booking.checkInDate.toISOString(),
      checkOutDate: a.booking.checkOutDate.toISOString(),
    },
  }));

  const serialisedDepartures = departureRecords.map((d) => ({
    ...d,
    scheduledDeparture: d.scheduledDeparture?.toISOString() ?? null,
    billSettledAt: d.billSettledAt?.toISOString() ?? null,
    luggageReadyAt: d.luggageReadyAt?.toISOString() ?? null,
    leftPropertyAt: d.leftPropertyAt?.toISOString() ?? null,
    arrivedJettyAt: d.arrivedJettyAt?.toISOString() ?? null,
    boardedAt: d.boardedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    booking: {
      ...d.booking,
      checkInDate: d.booking.checkInDate.toISOString(),
      checkOutDate: d.booking.checkOutDate.toISOString(),
    },
  }));

  return (
    <ArrivalsPageClient
      arrivals={serialisedArrivals}
      departureRecords={serialisedDepartures}
      staff={staff}
      defaultPlans={defaultPlans}
    />
  );
}
