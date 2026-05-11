import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST body: { quantity: number, notes?: string, recordedBy?: string }
 * Decrements currentStock and records a USED movement.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const qty = Number(data.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'quantity must be > 0' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.logisticsInventoryItem.findFirst({
        where: { id: params.id, tenantId: session.user.tenantId },
      });
      if (!item) throw new Error('NOT_FOUND');

      const newStock = Math.max(0, item.currentStock - qty);
      await tx.logisticsInventoryItem.update({
        where: { id: params.id },
        data: { currentStock: newStock },
      });

      const movement = await tx.logisticsStockMovement.create({
        data: {
          tenantId: session.user.tenantId!,
          itemId: params.id,
          type: 'USED',
          quantity: -qty,
          balanceAfter: newStock,
          notes: data.notes?.trim() || null,
          reference: data.reference?.trim() || null,
          recordedBy: data.recordedBy?.trim() || session.user.name || null,
        },
      });
      return { item: { ...item, currentStock: newStock }, movement };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    console.error('inventory use POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
