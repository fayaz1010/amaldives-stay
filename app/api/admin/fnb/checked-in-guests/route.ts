import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/fnb/checked-in-guests
 * Returns all bookings currently CHECKED_IN for this tenant,
 * with room number and guest name, for pre-filling F&B reservations.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: 'CHECKED_IN',
      },
      include: {
        room: { select: { number: true } },
        guest: {
          include: {
            guestProfile: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { room: { number: 'asc' } },
    });

    const guests = bookings.map((b) => {
      const profile = b.guest.guestProfile;
      const fullName = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : (b.guest.name ?? 'Guest');
      return {
        bookingId: b.id,
        confirmationNumber: b.confirmationNumber,
        roomNumber: b.room.number,
        guestName: fullName,
        guestPhone: profile?.phone ?? null,
        checkOutDate: b.checkOutDate.toISOString(),
      };
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error('checked-in-guests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
