import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Returns upcoming/active bookings that don't yet have an arrival record */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        arrival: null, // no arrival record yet
        OR: q
          ? [
              { confirmationNumber: { contains: q, mode: 'insensitive' } },
              { guest: { name: { contains: q, mode: 'insensitive' } } },
              { room: { number: { contains: q, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: { select: { id: true, number: true, name: true } },
      },
      orderBy: { checkInDate: 'asc' },
      take: 20,
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Bookings search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
