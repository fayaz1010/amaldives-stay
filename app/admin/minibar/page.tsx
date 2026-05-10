import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MinIBarManager } from '@/components/admin/minibar-manager';

export const dynamic = 'force-dynamic';

export default async function MinIBarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const [items, pendingUsages, rooms] = await Promise.all([
    prisma.minIBarItem.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.minIBarUsage.findMany({
      where: { tenantId, status: 'PENDING' },
      include: {
        item: true,
        room: true,
        booking: {
          include: {
            guest: { include: { guestProfile: true } },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.room.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, number: true, name: true },
      orderBy: { number: 'asc' },
    }),
  ]);

  return (
    <MinIBarManager
      items={items}
      pendingUsages={pendingUsages as any}
      rooms={rooms}
    />
  );
}
