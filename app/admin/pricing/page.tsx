import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  PricingManager,
  type RoomTypeRow,
  type RatePlanRow,
} from '@/components/admin/pricing-manager';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const [grouped, ratePlans] = await Promise.all([
    prisma.room.groupBy({
      by: ['type'],
      where: { tenantId },
      _avg: { basePrice: true },
      _count: true,
    }),
    prisma.ratePlan.findMany({
      where: { tenantId },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  const types = grouped.map((g) => g.type);
  const sampleRooms = types.length
    ? await prisma.room.findMany({
        where: { tenantId, type: { in: types } },
        select: { id: true, type: true },
      })
    : [];

  const idByType = new Map<string, string>();
  for (const r of sampleRooms) {
    if (!idByType.has(r.type)) idByType.set(r.type, r.id);
  }

  const roomTypes: RoomTypeRow[] = grouped.map((g) => ({
    id: idByType.get(g.type) ?? '',
    type: g.type,
    basePrice: g._avg.basePrice ?? 0,
    count: g._count,
  }));

  const ratePlanRows: RatePlanRow[] = ratePlans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    multiplier: p.multiplier,
    minStay: p.minStay,
    isActive: p.isActive,
  }));

  return <PricingManager roomTypes={roomTypes} ratePlans={ratePlanRows} />;
}
