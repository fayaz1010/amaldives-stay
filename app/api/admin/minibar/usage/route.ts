import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MinIBarStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const bookingId = searchParams.get('bookingId');
    const status = searchParams.get('status') as MinIBarStatus | null;

    const usages = await prisma.minIBarUsage.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(roomId ? { roomId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        item: { select: { id: true, name: true, price: true, category: true, isFree: true } },
        room: { select: { id: true, number: true, name: true } },
      },
      orderBy: { recordedAt: 'desc' },
    });

    return NextResponse.json(usages);
  } catch (error) {
    console.error('MinIBar usage GET error:', error);
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
    const { bookingId, roomId, itemId, notes } = data ?? {};
    const quantity = Math.max(1, Number(data?.quantity ?? 1));

    if (!roomId || !itemId) {
      return NextResponse.json(
        { error: 'roomId and itemId are required' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const item = await prisma.minIBarItem.findFirst({
      where: { id: itemId, tenantId: session.user.tenantId, isActive: true },
    });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId: session.user.tenantId },
        select: { id: true },
      });
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
    }

    const amount = item.isFree ? 0 : item.price * quantity;

    const usage = await prisma.minIBarUsage.create({
      data: {
        tenantId: session.user.tenantId,
        bookingId: bookingId || null,
        roomId,
        itemId,
        quantity,
        isFree: item.isFree,
        amount,
        status: 'PENDING',
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        item: { select: { id: true, name: true, price: true, category: true, isFree: true } },
        room: { select: { id: true, number: true, name: true } },
      },
    });

    return NextResponse.json(usage, { status: 201 });
  } catch (error) {
    console.error('MinIBar usage POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
