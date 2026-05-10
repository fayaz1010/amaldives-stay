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

  // All active arrival records (not yet checked in + recently checked in within 24h)
  const arrivals = await prisma.arrivalRecord.findMany({
    where: {
      tenantId,
      OR: [
        { status: { not: 'CHECKED_IN' } },
        {
          status: 'CHECKED_IN',
          checkedInAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
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
    },
    orderBy: { scheduledArrival: 'asc' },
  });

  // Upcoming departures — checked-in or confirmed, checking out within next 7 days
  const checkoutCutoff = new Date();
  checkoutCutoff.setDate(checkoutCutoff.getDate() + 7);

  const departures = await prisma.booking.findMany({
    where: {
      tenantId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      checkOutDate: {
        gte: new Date(new Date().toDateString()), // from start of today
        lte: checkoutCutoff,
      },
    },
    include: {
      guest: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, name: true } },
      arrival: {
        select: {
          transportType: true,
          transportRef: true,
          scheduledArrival: true,
        },
      },
    },
    orderBy: { checkOutDate: 'asc' },
  });

  // Staff for pickup assignment
  const staff = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'] },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const serialisedArrivals = arrivals.map((a) => ({
    ...a,
    scheduledArrival: a.scheduledArrival?.toISOString() ?? null,
    departedAt: a.departedAt?.toISOString() ?? null,
    eta: a.eta?.toISOString() ?? null,
    arrivedJettyAt: a.arrivedJettyAt?.toISOString() ?? null,
    arrivedPropertyAt: a.arrivedPropertyAt?.toISOString() ?? null,
    checkedInAt: a.checkedInAt?.toISOString() ?? null,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
    booking: {
      ...a.booking,
      checkInDate: a.booking.checkInDate instanceof Date ? a.booking.checkInDate.toISOString() : a.booking.checkInDate,
      checkOutDate: a.booking.checkOutDate instanceof Date ? a.booking.checkOutDate.toISOString() : a.booking.checkOutDate,
    },
  }));

  const serialisedDepartures = departures.map((b) => ({
    ...b,
    checkInDate: b.checkInDate instanceof Date ? b.checkInDate.toISOString() : b.checkInDate,
    checkOutDate: b.checkOutDate instanceof Date ? b.checkOutDate.toISOString() : b.checkOutDate,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
    arrival: b.arrival ? {
      ...b.arrival,
      scheduledArrival: b.arrival.scheduledArrival instanceof Date ? b.arrival.scheduledArrival.toISOString() : b.arrival.scheduledArrival,
    } : null,
  }));

  return (
    <ArrivalsPageClient
      arrivals={serialisedArrivals}
      departures={serialisedDepartures}
      staff={staff}
    />
  );
}
