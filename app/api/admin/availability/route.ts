import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const startDate = parseDateOnly(startParam);
    const endDate = parseDateOnly(endParam);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'endDate must be on or after startDate' },
        { status: 400 }
      );
    }

    // End of the range: include the entire endDate (exclusive upper bound = endDate + 1 day)
    const rangeEndExclusive = new Date(endDate);
    rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);

    const rooms = await prisma.room.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { number: 'asc' },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            // Overlap test: booking.checkInDate < rangeEndExclusive AND booking.checkOutDate > startDate
            checkInDate: { lt: rangeEndExclusive },
            checkOutDate: { gt: startDate },
          },
          select: {
            checkInDate: true,
            checkOutDate: true,
          },
        },
      },
    });

    const result = rooms.map((room) => {
      const bookedSet = new Set<string>();

      for (const b of room.bookings) {
        // Iterate each occupied night from checkIn (inclusive) up to checkOut (exclusive)
        const cursor = new Date(
          Date.UTC(
            b.checkInDate.getUTCFullYear(),
            b.checkInDate.getUTCMonth(),
            b.checkInDate.getUTCDate()
          )
        );
        const stop = new Date(
          Date.UTC(
            b.checkOutDate.getUTCFullYear(),
            b.checkOutDate.getUTCMonth(),
            b.checkOutDate.getUTCDate()
          )
        );

        while (cursor < stop) {
          if (cursor >= startDate && cursor <= endDate) {
            bookedSet.add(toDateKey(cursor));
          }
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }

      return {
        id: room.id,
        number: room.number,
        name: room.name,
        type: room.type,
        basePrice: room.basePrice,
        status: room.status,
        bookedDates: Array.from(bookedSet).sort(),
      };
    });

    return NextResponse.json({
      rooms: result,
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
    });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
