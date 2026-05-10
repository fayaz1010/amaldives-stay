import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FnBManager } from '@/components/admin/fnb-manager';

export const dynamic = 'force-dynamic';

export default async function FnBPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [outletsRaw, todayReservationCount, openBillCount] = await Promise.all([
    prisma.fnBOutlet.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { menuItems: true, reservations: true, bills: true },
        },
      },
    }),
    prisma.fnBReservation.count({
      where: {
        tenantId,
        date: { gte: startOfDay, lt: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
      },
    }),
    prisma.fnBBill.count({
      where: { tenantId, status: 'OPEN' },
    }),
  ]);

  const outlets = outletsRaw.map((o) => ({
    id: o.id,
    name: o.name,
    description: o.description,
    outletType: o.outletType,
    location: o.location,
    isActive: o.isActive,
    menuItemCount: o._count.menuItems,
    reservationCount: o._count.reservations,
    billCount: o._count.bills,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return (
    <FnBManager
      outlets={outlets}
      todayReservationCount={todayReservationCount}
      openBillCount={openBillCount}
    />
  );
}
