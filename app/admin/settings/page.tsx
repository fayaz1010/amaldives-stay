import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: { properties: true },
  });

  if (!tenant) redirect('/auth/signin');

  const property = tenant.properties[0] ?? null;

  return <SettingsForm tenant={tenant} property={property} />;
}
