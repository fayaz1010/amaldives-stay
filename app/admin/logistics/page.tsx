import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LogisticsBoard } from '@/components/admin/logistics-board';

export const dynamic = 'force-dynamic';

export default async function LogisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const orders = await prisma.logisticsOrder.findMany({
    where: { tenantId: session.user.tenantId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalOrders = orders.length;
  const inTransit = orders.filter((o) => o.status === 'IN_TRANSIT').length;
  const itemsPending = orders.reduce(
    (sum, o) => sum + o.items.filter((i) => i.status === 'PENDING').length,
    0
  );
  const deliveredThisMonth = orders.filter(
    (o) => o.status === 'DELIVERED' && o.arrivedAt && new Date(o.arrivedAt) >= monthStart
  ).length;

  const stats = {
    totalOrders,
    itemsPending,
    inTransit,
    deliveredThisMonth,
  };

  return <LogisticsBoard orders={orders as any} stats={stats} />;
}
