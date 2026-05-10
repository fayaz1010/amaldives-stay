import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = { tenantId: session.user.tenantId };
    if (status) where.status = status;

    const orders = await prisma.logisticsOrder.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Logistics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const itemsInput = Array.isArray(data.items) ? data.items : [];
    const itemsData = itemsInput
      .filter((it: any) => it && typeof it.name === 'string' && it.name.trim())
      .map((it: any) => ({
        name: String(it.name).trim(),
        quantity: Number(it.quantity) || 1,
        unit: it.unit ? String(it.unit) : 'pcs',
        estimatedCost: it.estimatedCost != null ? Number(it.estimatedCost) : null,
        notes: it.notes ? String(it.notes) : null,
      }));

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.logisticsOrder.create({
        data: {
          tenantId: session.user.tenantId!,
          title: data.title.trim(),
          description: data.description ? String(data.description) : null,
          requestedBy: data.requestedBy ? String(data.requestedBy) : (session.user.name || null),
          destination: data.destination ? String(data.destination) : 'Male',
          urgency: data.urgency || 'MEDIUM',
          notes: data.notes ? String(data.notes) : null,
          status: 'DRAFT',
          items: itemsData.length
            ? { create: itemsData }
            : undefined,
        },
        include: { items: true },
      });
      return created;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Logistics POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
