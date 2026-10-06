import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { OnboardingForm } from './onboarding-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up your guesthouse · Vayves', robots: { index: false } };

/**
 * First stop for a guesthouse owner who signed up at /auth/signup: create the
 * property (tenant), then start the 30-day card trial on the billing page.
 * Also reachable from the guest portal for owners whose account was created
 * as a guest before owner sign-up existed.
 */
export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');

  // Already has a property — nothing to set up here.
  if (session.user.tenantId && session.user.role !== 'GUEST') redirect('/admin');

  const firstName = (session.user.name ?? '').split(' ')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Step 1 of 2</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {firstName ? `Welcome, ${firstName}. ` : 'Welcome. '}Let&apos;s set up your guesthouse
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Name your property and pick its web address. Next you start your 30-day free trial of the
          Growth plan (US$19/month afterwards): your card is saved securely with Stripe and not
          charged during the trial. Cancel any time before it ends from Settings &rarr; Billing.
        </p>
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <OnboardingForm />
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Signed in as <strong>{session.user.email}</strong>.
        </p>
      </div>
    </div>
  );
}
