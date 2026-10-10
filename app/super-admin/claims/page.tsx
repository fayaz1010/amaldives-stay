import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ClaimsQueue } from '@/components/super-admin/claims-queue';

export default async function ClaimsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized');
  }

  const claims = await prisma.claimAssistRequest.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return <ClaimsQueue claims={claims} />;
}
