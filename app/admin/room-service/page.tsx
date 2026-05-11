import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RoomServiceBoard } from '@/components/admin/room-service-board';

export const dynamic = 'force-dynamic';

const EXTRA_CATEGORIES = ['EXCURSION', 'DIVING', 'SNORKELLING', 'PICNIC', 'FISHING', 'RENTAL'];

export default async function RoomServicePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const [orders, rooms] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: {
        tenantId: session.user.tenantId,
        service: { category: { notIn: EXTRA_CATEGORIES } },
      },
      include: {
        service: { select: { name: true, category: true } },
        booking: {
          select: {
            id: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.room.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      select: { id: true, number: true },
      orderBy: { number: 'asc' },
    }),
  ]);

  return <RoomServiceBoard orders={orders} rooms={rooms} />;
}
