import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TransportSettingsClient } from '@/components/admin/transport-settings-client';

export const dynamic = 'force-dynamic';

export default async function TransportSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const options = await prisma.transportOption.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  const serialized = options.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return <TransportSettingsClient initialOptions={serialized} />;
}
