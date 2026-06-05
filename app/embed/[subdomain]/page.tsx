import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BookingEngine } from '@/components/booking/booking-engine';

export const dynamic = 'force-dynamic';

export default async function EmbedBookingPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: params.subdomain, status: 'ACTIVE' },
    select: { name: true, subdomain: true, theme: true },
  });

  if (!tenant) notFound();

  const theme = (tenant.theme ?? {}) as { primaryColor?: string };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BookingEngine
        subdomain={tenant.subdomain}
        tenantName={tenant.name}
        primaryColor={theme.primaryColor}
        source="embed"
        compact
      />
    </div>
  );
}
