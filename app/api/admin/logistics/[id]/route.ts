import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
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
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Logistics GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.logisticsOrder.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: any = {};

    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'SENT' && !data.sentAt) {
        updates.sentAt = new Date();
      }
      if (data.status === 'DELIVERED' && !data.arrivedAt) {
        updates.arrivedAt = new Date();
      }
    }
    if (data.sentAt !== undefined) {
      updates.sentAt = data.sentAt ? new Date(data.sentAt) : null;
    }
    if (data.arrivedAt !== undefined) {
      updates.arrivedAt = data.arrivedAt ? new Date(data.arrivedAt) : null;
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.urgency !== undefined) updates.urgency = data.urgency;
    if (data.destination !== undefined) updates.destination = data.destination;
    if (data.requestedBy !== undefined) updates.requestedBy = data.requestedBy;

    const order = await prisma.logisticsOrder.update({
      where: { id: params.id },
      data: updates,
      include: { items: true },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Logistics PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.logisticsOrder.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const order = await prisma.logisticsOrder.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Logistics DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
