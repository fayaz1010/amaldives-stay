import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GuestDetailPage } from '@/components/admin/guest-detail-page';

export const dynamic = 'force-dynamic';

export default async function GuestDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');
  const tenantId = session.user.tenantId;

  const user = await prisma.user.findFirst({
    where: {
      id: params.id,
      OR: [
        { tenantId },
        { bookings: { some: { tenantId } } },
      ],
    },
    include: {
      guestProfile: true,
      bookings: {
        where: { tenantId },
        include: {
          room: true,
          payments: true,
          serviceOrders: { include: { service: true, room: true } },
          arrival: true,
          departure: true,
          minIBarUsages: { include: { item: true } },
        },
        orderBy: { checkInDate: 'desc' },
      },
    },
  });

  if (!user) notFound();

  const data = JSON.parse(JSON.stringify(user));
  return <GuestDetailPage guest={data} />;
}
