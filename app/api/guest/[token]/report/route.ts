import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { guestToken: params.token },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        room: { select: { number: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const category: string = typeof body.category === 'string' ? body.category.trim() : '';
    const description: string = typeof body.description === 'string' ? body.description.trim() : '';

    if (!category || !description) {
      return NextResponse.json(
        { error: 'Category and description are required' },
        { status: 400 }
      );
    }

    const roomLabel = booking.room?.number ? `Room ${booking.room.number}` : 'Guest';

    const task = await prisma.staffTask.create({
      data: {
        tenantId: booking.tenantId,
        bookingId: booking.id,
        source: 'GUEST_PORTAL',
        title: `Guest Report: ${category} - ${roomLabel}`,
        description,
        category: 'MAINTENANCE',
        priority: 'HIGH',
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, taskId: task.id });
  } catch (error: any) {
    console.error('Guest portal report error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
