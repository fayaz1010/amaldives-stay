
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { GuestPortal, type GuestPortalBooking } from '@/components/guest/guest-portal';

export const dynamic = 'force-dynamic';

export default async function GuestPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || session.user.role !== 'GUEST') {
    redirect('/unauthorized');
  }

  // Only this user's real bookings; an account with none gets an empty state.
  const rows = await prisma.booking.findMany({
    where: { guestId: session.user.id },
    orderBy: { checkInDate: 'desc' },
    select: {
      id: true,
      confirmationNumber: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
      totalAmount: true,
      property: { select: { name: true } },
      room: { select: { name: true, typeLabel: true } },
    },
  });
  const bookings: GuestPortalBooking[] = rows.map((b) => ({
    id: b.id,
    confirmationNumber: b.confirmationNumber,
    hotelName: b.property.name,
    roomType: b.room.typeLabel ?? b.room.name,
    checkIn: b.checkInDate.toISOString(),
    checkOut: b.checkOutDate.toISOString(),
    status: b.status,
    totalAmount: b.totalAmount,
  }));

  return (
    <>
      {/* Owners who signed up before owner sign-up existed were made guests.
          Give them a way out to the owner onboarding. */}
      <div className="bg-cyan-700 text-white text-sm px-4 py-2 text-center">
        Run a guesthouse?{' '}
        <Link href="/onboarding" className="underline font-semibold">
          Set up your property and start your free 30-day trial
        </Link>
      </div>
      <GuestPortal user={session.user} bookings={bookings} />
    </>
  );
}
