import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId;

    // Find all bookings that have NO staffTasks yet
    const bookingsWithTasks = await prisma.staffTask.findMany({
      where: { tenantId, source: 'BOOKING', bookingId: { not: null } },
      select: { bookingId: true },
    });
    const alreadyHasTasks = new Set(bookingsWithTasks.map((t) => t.bookingId));

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      include: {
        room: { select: { number: true } },
        guest: {
          select: {
            name: true,
            guestProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const missing = bookings.filter((b) => !alreadyHasTasks.has(b.id));

    if (missing.length === 0) {
      return NextResponse.json({ created: 0, message: 'All bookings already have tasks' });
    }

    const tasksToCreate: any[] = [];
    for (const b of missing) {
      const profile = b.guest?.guestProfile;
      const guestLabel = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : (b.guest?.name ?? 'Guest');
      const roomLabel = b.room?.number ? ` Rm ${b.room.number}` : '';
      const checkInLabel = b.checkInDate.toLocaleDateString();

      tasksToCreate.push(
        {
          tenantId,
          bookingId: b.id,
          source: 'BOOKING',
          category: 'TRANSFER',
          title: `Arrange transfer — ${guestLabel}${roomLabel} (${checkInLabel})`,
          description: 'Book and confirm transport from airport to property for arriving guest.',
          priority: 'HIGH',
          status: 'PENDING',
          dueDate: b.checkInDate,
        },
        {
          tenantId,
          bookingId: b.id,
          source: 'BOOKING',
          category: 'AIRPORT_PICKUP',
          title: `Airport pickup — ${guestLabel}${roomLabel} (${checkInLabel})`,
          description: 'Confirm who is picking up the guest at the airport and arrange logistics.',
          priority: 'HIGH',
          status: 'PENDING',
          dueDate: b.checkInDate,
        },
        {
          tenantId,
          bookingId: b.id,
          source: 'BOOKING',
          category: 'ARRIVAL_WELCOME',
          title: `Arrival welcome — ${guestLabel}${roomLabel} (${checkInLabel})`,
          description: 'Prepare welcome drinks, room key, and check-in materials.',
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: b.checkInDate,
        }
      );
    }

    await prisma.staffTask.createMany({ data: tasksToCreate });

    return NextResponse.json({
      created: tasksToCreate.length,
      bookings: missing.length,
    });
  } catch (error) {
    console.error('Backfill tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
