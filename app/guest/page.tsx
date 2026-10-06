
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { GuestPortal } from '@/components/guest/guest-portal';

export default async function GuestPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || session.user.role !== 'GUEST') {
    redirect('/unauthorized');
  }

  return (
    <>
      {/* Owners who signed up before owner sign-up existed were made guests.
          Give them a way out to the owner onboarding. */}
      <div className="bg-cyan-700 text-white text-sm px-4 py-2 text-center">
        Run a guesthouse?{' '}
        <Link href="/onboarding" className="underline font-semibold">
          Set up your property and start your free 30-day trial
        </Link>
      </div>
      <GuestPortal user={session.user} />
    </>
  );
}
