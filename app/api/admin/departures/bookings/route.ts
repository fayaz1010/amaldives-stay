import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const q = searchParams.get('q') ?? '';
    const date = searchParams.get('date');
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    // Direct lookup by booking ID
    if (id) {
      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: session.user.tenantId },
        include: {
          guest: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, number: true, name: true } },
          departure: { select: { id: true } },
        },
      });
      if (!booking) return NextResponse.json({ bookings: [], total: 0, hasMore: false });
      const { departure, ...rest } = booking;
      return NextResponse.json({
        bookings: [{ ...rest, checkInDate: rest.checkInDate.toISOString(), checkOutDate: rest.checkOutDate.toISOString(), createdAt: rest.createdAt.toISOString(), updatedAt: rest.updatedAt.toISOString() }],
        total: 1,
        hasMore: false,
      });
    }

    const where: any = {
      tenantId: session.user.tenantId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      departure: null, // no departure plan yet
    };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.checkOutDate = { gte: start, lte: end };
    }

    if (q) {
      where.OR = [
        { guest: { name: { contains: q, mode: 'insensitive' } } },
        { confirmationNumber: { contains: q, mode: 'insensitive' } },
        { room: { number: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          guest: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, number: true, name: true } },
        },
        orderBy: { checkOutDate: 'asc' },
        take: PAGE_SIZE,
        skip: offset,
      }),
    ]);

    const serialized = bookings.map((b) => ({
      ...b,
      checkInDate: b.checkInDate.toISOString(),
      checkOutDate: b.checkOutDate.toISOString(),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return NextResponse.json({ bookings: serialized, total, offset, hasMore: offset + PAGE_SIZE < total });
  } catch (error) {
    console.error('Departure bookings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
