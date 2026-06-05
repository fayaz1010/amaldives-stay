import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';
import { getSharing, categoryWhere, categoryCreatePropertyId } from '@/lib/property-sharing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [sharing, activePropertyId] = await Promise.all([
      getSharing(session.user.tenantId),
      getActivePropertyId(session.user.tenantId),
    ]);
    const items = await prisma.logisticsInventoryItem.findMany({
      where: { tenantId: session.user.tenantId, ...categoryWhere('inventory', sharing, activePropertyId), isActive: true },
      include: {
        stockMovements: {
          orderBy: { recordedAt: 'desc' },
          take: 5,
        },
        _count: { select: { orderItems: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('inventory GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    if (!data.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const [sharing, activePropertyId] = await Promise.all([
      getSharing(session.user.tenantId),
      getActivePropertyId(session.user.tenantId),
    ]);
    const item = await prisma.logisticsInventoryItem.create({
      data: {
        tenantId: session.user.tenantId,
        propertyId: categoryCreatePropertyId('inventory', sharing, activePropertyId),
        name: data.name.trim(),
        category: data.category?.trim() || 'general',
        unit: data.unit?.trim() || 'pcs',
        description: data.description?.trim() || null,
        parLevel: Number(data.parLevel ?? 0),
        currentStock: Number(data.openingStock ?? 0),
        location: data.location?.trim() || null,
      },
    });

    // Record opening stock movement if > 0
    if (Number(data.openingStock) > 0) {
      await prisma.logisticsStockMovement.create({
        data: {
          tenantId: session.user.tenantId,
          itemId: item.id,
          type: 'ADJUSTED',
          quantity: Number(data.openingStock),
          balanceAfter: Number(data.openingStock),
          notes: 'Opening stock',
          recordedBy: session.user.name || null,
        },
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('inventory POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
