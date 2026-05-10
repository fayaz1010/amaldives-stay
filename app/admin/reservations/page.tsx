import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ReservationsList } from '@/components/admin/reservations-list';

export const dynamic = 'force-dynamic';

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const bookings = await db.getBookings({});

  const serializable = bookings.map((b: any) => ({
    ...b,
    checkInDate: b.checkInDate.toISOString(),
    checkOutDate: b.checkOutDate.toISOString(),
    createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
    updatedAt: b.updatedAt?.toISOString?.() ?? b.updatedAt,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500">
            {bookings.length} total bookings
          </p>
        </div>
        <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
          <Link href="/admin/reservations/new">
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Link>
        </Button>
      </div>

      <ReservationsList bookings={serializable} />
    </div>
  );
}
