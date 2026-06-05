import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MiraSummary } from '@/components/admin/mira-summary';

export const dynamic = 'force-dynamic';

export default async function MiraPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');
  return <MiraSummary />;
}
