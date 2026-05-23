import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { WebManager } from '@/components/admin/web-manager';

export const dynamic = 'force-dynamic';

interface WebPageProps {
  searchParams: { tab?: string };
}

export default async function WebAdminPage({ searchParams }: WebPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      name: true,
      description: true,
      logo: true,
      subdomain: true,
      plan: true,
      amaldivesSlug: true,
      properties: {
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          city: true,
          country: true,
          phone: true,
          email: true,
          website: true,
          images: true,
          amenities: true,
          settings: true,
          rooms: {
            where: { status: { in: ['AVAILABLE', 'OCCUPIED'] } },
            select: {
              id: true,
              type: true,
              capacity: true,
              basePrice: true,
              images: true,
            },
            distinct: ['type'],
          },
        },
        take: 1,
      },
    },
  });

  if (!tenant) redirect('/auth/signin');

  const property = tenant.properties[0] ?? null;

  // Full room list (one row per physical unit) for the Channels tab —
  // owner picks which Room each external iCal feed maps to.
  const allRooms = await prisma.room.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, number: true, name: true, type: true },
    orderBy: { number: 'asc' },
  });

  return (
    <WebManager
      tenant={tenant}
      property={property}
      subdomain={tenant.subdomain}
      plan={tenant.plan}
      allRooms={allRooms}
      defaultTab={searchParams.tab ?? 'profile'}
    />
  );
}
