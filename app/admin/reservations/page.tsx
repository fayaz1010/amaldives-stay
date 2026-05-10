import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { ReservationsBoard } from '@/components/admin/reservations-board';

export const dynamic = 'force-dynamic';

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const bookings = await db.getBookings({});

  const serializable = bookings.map((b: any) => ({
    ...b,
    checkInDate: b.checkInDate instanceof Date ? b.checkInDate.toISOString() : b.checkInDate,
    checkOutDate: b.checkOutDate instanceof Date ? b.checkOutDate.toISOString() : b.checkOutDate,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
  }));

  return <ReservationsBoard bookings={serializable} />;
}
