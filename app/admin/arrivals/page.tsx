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
    where: { tenantId, role: { in: ['STAFF', 'MANAGER', 'TENANT_ADMIN', 'FRONT_DESK'] } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <ArrivalsPageClient
      arrivals={arrivals}
      departures={departures}
      staff={staff}
    />
  );
}
