import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FinanceManager } from '@/components/admin/finance-manager';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as any) ?? {};
  const exchangeRate = settings.exchangeRate ?? 15.4;

  return <FinanceManager exchangeRate={exchangeRate} />;
}
