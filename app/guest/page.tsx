
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { GuestPortal } from '@/components/guest/guest-portal';

export default async function GuestPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || session.user.role !== 'GUEST') {
    redirect('/unauthorized');
  }

  return <GuestPortal user={session.user} />;
}
