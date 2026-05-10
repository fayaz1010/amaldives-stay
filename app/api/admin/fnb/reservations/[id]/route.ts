import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const updates: any = {};
    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = data.status;
    }
    if (data.guestName !== undefined) updates.guestName = String(data.guestName).trim();
    if (data.guestPhone !== undefined) updates.guestPhone = data.guestPhone?.trim() ?? null;
    if (data.partySize !== undefined) updates.partySize = Math.max(1, Number(data.partySize));
    if (data.notes !== undefined) updates.notes = data.notes?.trim() ?? null;
    if (data.date !== undefined) {
      const d = new Date(data.date);
      if (!Number.isNaN(d.getTime())) updates.date = d;
    }

    const reservation = await prisma.fnBReservation.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
      include: { outlet: { select: { id: true, name: true, outletType: true } } },
    });

    return NextResponse.json({
      reservation: {
        ...reservation,
        date: reservation.date.toISOString(),
        createdAt: reservation.createdAt.toISOString(),
        updatedAt: reservation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('FnB Reservation PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
