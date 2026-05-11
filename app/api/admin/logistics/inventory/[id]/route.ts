import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const item = await prisma.logisticsInventoryItem.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        stockMovements: { orderBy: { recordedAt: 'desc' }, take: 50 },
      },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    console.error('inventory [id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const item = await prisma.logisticsInventoryItem.updateMany({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: {
        ...(data.name != null && { name: String(data.name).trim() }),
        ...(data.category != null && { category: String(data.category).trim() }),
        ...(data.unit != null && { unit: String(data.unit).trim() }),
        ...(data.description != null && { description: data.description?.trim() || null }),
        ...(data.parLevel != null && { parLevel: Number(data.parLevel) }),
        ...(data.location != null && { location: data.location?.trim() || null }),
        ...(data.isActive != null && { isActive: Boolean(data.isActive) }),
      },
    });
    return NextResponse.json({ ok: true, count: item.count });
  } catch (error) {
    console.error('inventory [id] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.logisticsInventoryItem.updateMany({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('inventory [id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
