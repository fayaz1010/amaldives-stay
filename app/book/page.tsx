import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BookingEngine } from '@/components/booking/booking-engine';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  searchParams,
}: {
  searchParams?: {
    source?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    roomId?: string;
  };
}) {
  const headersList = headers();
  const subdomain = headersList.get('X-Tenant-Subdomain');
  const customDomain = headersList.get('X-Tenant-Domain');
  if (!subdomain && !customDomain) notFound();
  const source =
    searchParams?.source === 'amaldives.com' ? 'amaldives.com' : 'stay_subdomain';
  const adultsNum = searchParams?.adults ? parseInt(searchParams.adults, 10) : NaN;

  const tenant = await prisma.tenant.findFirst({
    where: subdomain
      ? { subdomain, status: 'ACTIVE' }
      : { domain: customDomain!, status: 'ACTIVE' },
    select: { name: true, subdomain: true, theme: true, logo: true },
  });
  if (!tenant) notFound();

  const theme = (tenant.theme ?? {}) as { primaryColor?: string };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <BookingEngine
          subdomain={tenant.subdomain}
          tenantName={tenant.name}
          primaryColor={theme.primaryColor}
          source={source}
          initialCheckIn={searchParams?.checkIn}
          initialCheckOut={searchParams?.checkOut}
          logoUrl={tenant.logo}
          initialAdults={Number.isFinite(adultsNum) ? adultsNum : undefined}
          initialRoomId={searchParams?.roomId}
        />
      </div>
    </div>
  );
}
