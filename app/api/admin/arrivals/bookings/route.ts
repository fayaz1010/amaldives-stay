import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/** Returns upcoming/active bookings that don't yet have an arrival record */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const id = searchParams.get('id'); // fetch single booking by ID
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
    const date = searchParams.get('date');

    // Single booking lookup by ID (for pre-selection)
    if (id) {
      const booking = await prisma.booking.findFirst({
        where: { id, tenantId: session.user.tenantId },
        include: {
          guest: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, number: true, name: true } },
        },
      });
      return NextResponse.json({ bookings: booking ? [booking] : [], total: booking ? 1 : 0, hasMore: false });
    }

    // Date filter: match bookings whose checkInDate falls on `date`
    let dateFilter: any = undefined;
    if (date) {
      const from = new Date(date);
      from.setHours(0, 0, 0, 0);
      const to = new Date(date);
      to.setHours(23, 59, 59, 999);
      dateFilter = { gte: from, lte: to };
    }

    const where: any = {
      tenantId: session.user.tenantId,
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      arrival: null,
      ...(dateFilter ? { checkInDate: dateFilter } : {}),
    };

    if (q) {
      where.OR = [
        { confirmationNumber: { contains: q, mode: 'insensitive' } },
        { guest: { name: { contains: q, mode: 'insensitive' } } },
        { room: { number: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          guest: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, number: true, name: true } },
        },
        orderBy: { checkInDate: 'asc' },
        take: PAGE_SIZE,
        skip: offset,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      total,
      offset,
      hasMore: offset + bookings.length < total,
    });
  } catch (error) {
    console.error('Bookings search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
