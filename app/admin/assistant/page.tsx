import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AssistantSettings } from '@/components/admin/assistant-settings';

export const dynamic = 'force-dynamic';

export default async function AssistantPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');
  return <AssistantSettings />;
}
