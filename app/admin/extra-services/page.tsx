import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ExtraServicesManager } from '@/components/admin/extra-services-manager';
import { GUEST_EXTRA_CATEGORIES } from '@/lib/guest-extras';

export const dynamic = 'force-dynamic';

const EXTRA_CATEGORIES = [...GUEST_EXTRA_CATEGORIES];

function serializeOrder(order: any) {
  return {
    ...order,
    scheduledDate: order.scheduledDate ? order.scheduledDate.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    rentalDueAt: order.rentalDueAt ? order.rentalDueAt.toISOString() : null,
    rentalReturnedAt: order.rentalReturnedAt
      ? order.rentalReturnedAt.toISOString()
      : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    booking: order.booking
      ? {
          ...order.booking,
          checkInDate: order.booking.checkInDate
            ? order.booking.checkInDate.toISOString()
            : null,
          checkOutDate: order.booking.checkOutDate
            ? order.booking.checkOutDate.toISOString()
            : null,
        }
      : null,
  };
}

export default async function ExtraServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const [services, ordersRaw, rooms] = await Promise.all([
    prisma.service.findMany({
      where: {
        tenantId,
        category: { in: EXTRA_CATEGORIES },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.serviceOrder.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        service: { category: { in: EXTRA_CATEGORIES } },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            duration: true,
          },
        },
        room: { select: { id: true, number: true, type: true } },
        booking: {
          select: {
            id: true,
            confirmationNumber: true,
            checkInDate: true,
            checkOutDate: true,
            room: { select: { id: true, number: true } },
            guest: {
              select: {
                id: true,
                name: true,
                guestProfile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            guestProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.room.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, number: true, type: true },
      orderBy: { number: 'asc' },
    }),
  ]);

  const orders = ordersRaw.map(serializeOrder);

  return (
    <ExtraServicesManager services={services} orders={orders} rooms={rooms} />
  );
}
