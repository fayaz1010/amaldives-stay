import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { NewBookingForm } from '@/components/admin/new-booking-form';

export const dynamic = 'force-dynamic';

export default async function NewReservationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const [property, tenant] = await Promise.all([
    prisma.property.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true },
    }),
  ]);

  if (!property || !tenant) {
    return (
      <div className="p-6">
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You need to set up a property before creating bookings.{' '}
          <Link href="/admin/settings" className="underline font-medium">
            Go to Settings
          </Link>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/admin/reservations">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to reservations
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
        <p className="text-sm text-gray-500">
          Walk through dates, room, guest info, and confirmation.
        </p>
      </div>

      <NewBookingForm
        propertyId={property.id}
        tenantSubdomain={tenant.subdomain}
      />
    </div>
  );
}
