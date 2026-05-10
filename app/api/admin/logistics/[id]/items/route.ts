import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.logisticsOrder.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const data = await request.json();
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const item = await prisma.logisticsOrderItem.create({
      data: {
        orderId: params.id,
        name: data.name.trim(),
        quantity: Number(data.quantity) || 1,
        unit: data.unit ? String(data.unit) : 'pcs',
        estimatedCost: data.estimatedCost != null ? Number(data.estimatedCost) : null,
        notes: data.notes ? String(data.notes) : null,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Logistics item POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
