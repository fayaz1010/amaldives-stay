import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST body: { roomId: string, itemIds?: string[] }
 * Records restock timestamp for a room (all standard items, or specific items).
 * Stores in tenant.settings.minibarRestockLog[roomId][itemId] = ISO timestamp.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, itemIds } = await request.json();
    if (!roomId) {
      return NextResponse.json({ error: 'roomId required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings as Record<string, any>) ?? {};
    const standard: Array<{ itemId: string; quantity: number }> =
      settings.minibarStandard ?? [];
    const restockLog: Record<string, Record<string, string>> =
      settings.minibarRestockLog ?? {};

    const now = new Date().toISOString();
    const targetItemIds: string[] =
      itemIds && Array.isArray(itemIds) && itemIds.length > 0
        ? itemIds
        : standard.map((s) => s.itemId);

    if (!restockLog[roomId]) restockLog[roomId] = {};
    for (const itemId of targetItemIds) {
      restockLog[roomId][itemId] = now;
    }

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { settings: { ...settings, minibarRestockLog: restockLog } },
    });

    return NextResponse.json({ ok: true, restockedAt: now, itemIds: targetItemIds });
  } catch (error) {
    console.error('minibar restock POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
