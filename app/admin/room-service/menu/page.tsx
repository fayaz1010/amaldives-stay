import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MenuManager } from '@/components/admin/menu-manager';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const items = await prisma.service.findMany({
    where: {
      tenantId: session.user.tenantId,
      NOT: { name: 'Room Service Request' },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return <MenuManager items={items} />;
}
