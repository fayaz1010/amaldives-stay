import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const outletId = url.searchParams.get('outletId');
    const dateParam = url.searchParams.get('date');
    const status = url.searchParams.get('status');

    const where: any = { tenantId: session.user.tenantId };
    if (outletId) where.outletId = outletId;
    if (status && VALID_STATUSES.includes(status as any)) where.status = status;
    if (dateParam) {
      const day = new Date(dateParam);
      if (!Number.isNaN(day.getTime())) {
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        where.date = { gte: start, lt: end };
      }
    }

    const reservations = await prisma.fnBReservation.findMany({
      where,
      include: { outlet: { select: { id: true, name: true, outletType: true } } },
      orderBy: { date: 'asc' },
    });

    const serialized = reservations.map((r) => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ reservations: serialized });
  } catch (error) {
    console.error('FnB Reservations GET error:', error);
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
    if (!data.outletId || !data.guestName?.trim() || !data.date) {
      return NextResponse.json({ error: 'outletId, guestName and date are required' }, { status: 400 });
    }

    const outlet = await prisma.fnBOutlet.findFirst({
      where: { id: data.outletId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const reservation = await prisma.fnBReservation.create({
      data: {
        tenantId: session.user.tenantId,
        outletId: data.outletId,
        bookingId: data.bookingId ?? null,
        guestName: data.guestName.trim(),
        guestPhone: data.guestPhone?.trim() ?? null,
        partySize: data.partySize ? Math.max(1, Number(data.partySize)) : 2,
        date,
        notes: data.notes?.trim() ?? null,
        status: 'PENDING',
      },
      include: { outlet: { select: { id: true, name: true, outletType: true } } },
    });

    return NextResponse.json(
      {
        reservation: {
          ...reservation,
          date: reservation.date.toISOString(),
          createdAt: reservation.createdAt.toISOString(),
          updatedAt: reservation.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('FnB Reservations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
