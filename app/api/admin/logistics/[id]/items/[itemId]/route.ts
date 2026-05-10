import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function verifyItem(orderId: string, itemId: string, tenantId: string) {
  return await prisma.logisticsOrderItem.findFirst({
    where: {
      id: itemId,
      orderId,
      order: { tenantId },
    },
    select: { id: true },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const found = await verifyItem(params.id, params.itemId, session.user.tenantId);
    if (!found) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: any = {};

    if (data.status !== undefined) updates.status = data.status;
    if (data.actualCost !== undefined) {
      updates.actualCost = data.actualCost === null ? null : Number(data.actualCost);
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.quantity !== undefined) updates.quantity = Number(data.quantity);
    if (data.name !== undefined) updates.name = String(data.name);
    if (data.unit !== undefined) updates.unit = String(data.unit);
    if (data.estimatedCost !== undefined) {
      updates.estimatedCost = data.estimatedCost === null ? null : Number(data.estimatedCost);
    }

    const item = await prisma.logisticsOrderItem.update({
      where: { id: params.itemId },
      data: updates,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Logistics item PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const found = await verifyItem(params.id, params.itemId, session.user.tenantId);
    if (!found) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.logisticsOrderItem.delete({
      where: { id: params.itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logistics item DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
