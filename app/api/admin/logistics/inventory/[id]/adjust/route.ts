import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST body: { quantity: number, notes?: string }
 * Sets absolute stock quantity (positive or negative delta) and records ADJUSTED movement.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    if (data.newStock == null) return NextResponse.json({ error: 'newStock required' }, { status: 400 });

    const newStock = Number(data.newStock);
    if (isNaN(newStock) || newStock < 0) return NextResponse.json({ error: 'newStock must be >= 0' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.logisticsInventoryItem.findFirst({
        where: { id: params.id, tenantId: session.user.tenantId },
      });
      if (!item) throw new Error('NOT_FOUND');

      const delta = newStock - item.currentStock;
      await tx.logisticsInventoryItem.update({
        where: { id: params.id },
        data: { currentStock: newStock },
      });

      const movement = await tx.logisticsStockMovement.create({
        data: {
          tenantId: session.user.tenantId!,
          itemId: params.id,
          type: 'ADJUSTED',
          quantity: delta,
          balanceAfter: newStock,
          notes: data.notes?.trim() || 'Manual adjustment',
          recordedBy: data.recordedBy?.trim() || session.user.name || null,
        },
      });
      return { item: { ...item, currentStock: newStock }, movement };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    console.error('inventory adjust POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
