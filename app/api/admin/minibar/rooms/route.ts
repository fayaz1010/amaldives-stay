import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId;

    const [tenant, rooms, items, usages] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      }),
      prisma.room.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, number: true, name: true, type: true },
        orderBy: { number: 'asc' },
      }),
      prisma.minIBarItem.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, category: true, isFree: true, price: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      // All non-waived usages — to compute needs-restock state
      prisma.minIBarUsage.findMany({
        where: { tenantId, status: { in: ['PENDING', 'ON_BILL'] } },
        select: {
          id: true, roomId: true, itemId: true, quantity: true,
          amount: true, isFree: true, status: true, recordedAt: true,
        },
        orderBy: { recordedAt: 'asc' },
      }),
    ]);

    const settings = (tenant?.settings as Record<string, any>) ?? {};
    const standard: Array<{ itemId: string; quantity: number }> =
      settings.minibarStandard ?? [];
    const restockLog: Record<string, Record<string, string>> =
      settings.minibarRestockLog ?? {};

    // Map items by id for quick lookup
    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

    // Group usages by roomId → itemId → usages[]
    const usagesByRoom: Record<string, Record<string, typeof usages>> = {};
    for (const u of usages) {
      if (!usagesByRoom[u.roomId]) usagesByRoom[u.roomId] = {};
      if (!usagesByRoom[u.roomId][u.itemId]) usagesByRoom[u.roomId][u.itemId] = [];
      usagesByRoom[u.roomId][u.itemId].push(u);
    }

    // Build room stock summary
    const roomStocks = rooms.map((room) => {
      const roomUsages = usagesByRoom[room.id] ?? {};
      const roomRestock = restockLog[room.id] ?? {};

      const stockItems = standard.map((s) => {
        const item = itemMap[s.itemId];
        if (!item) return null;
        const lastRestockedAt = roomRestock[s.itemId]
          ? new Date(roomRestock[s.itemId])
          : null;
        const activeUsages = (roomUsages[s.itemId] ?? []).filter(
          (u) =>
            !lastRestockedAt ||
            new Date(u.recordedAt) > lastRestockedAt
        );
        const consumedQty = activeUsages.reduce((sum, u) => sum + u.quantity, 0);
        const needsRestock = consumedQty > 0;
        return {
          itemId: s.itemId,
          itemName: item.name,
          itemCategory: item.category,
          isFree: item.isFree,
          standardQty: s.quantity,
          consumedQty,
          needsRestock,
          lastRestockedAt: lastRestockedAt?.toISOString() ?? null,
          usageIds: activeUsages.map((u) => u.id),
        };
      }).filter(Boolean);

      const needsRestockCount = stockItems.filter((i) => i?.needsRestock).length;
      const allStocked = standard.length > 0 && needsRestockCount === 0;

      return {
        room,
        stockItems,
        needsRestockCount,
        allStocked,
        hasStandard: standard.length > 0,
      };
    });

    return NextResponse.json({ rooms: roomStocks, standard, items });
  } catch (error) {
    console.error('minibar rooms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
