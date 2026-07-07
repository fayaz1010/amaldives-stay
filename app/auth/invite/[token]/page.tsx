import { redirect } from 'next/navigation';
import { verifyInviteToken } from '@/lib/staff-invite';
import { prisma } from '@/lib/db';
import { AcceptInviteForm } from './accept-invite-form';
import { Hotel, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Set your password · Vayves',
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verdict = verifyInviteToken(token);

  if (!verdict.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h1 className="font-bold text-gray-900">Invite link can&apos;t be used</h1>
          </div>
          <p className="text-sm text-gray-600">
            {verdict.reason === 'expired'
              ? 'This invite has expired. Ask your admin to generate a fresh link.'
              : 'This invite link is invalid. Ask your admin to send you a new one.'}
          </p>
        </div>
      </div>
    );
  }

  // Confirm the underlying user still exists. If the admin deleted them
  // since the invite was generated, fall through to the same "can't be
  // used" UX.
  const user = await prisma.user.findUnique({
    where: { id: verdict.payload.userId },
    select: { id: true, email: true, name: true, isActive: true, tenantId: true },
  });
  if (!user || !user.isActive) {
    redirect('/auth/signin');
  }

  const tenant = user.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, subdomain: true },
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
            <Hotel className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Vayves</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Set your password
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;ve been invited to{' '}
            <strong>{tenant?.name ?? 'a STAY account'}</strong> as{' '}
            <strong>{user.name ?? user.email}</strong>. Choose a password to
            finish setting up your account.
          </p>

          <AcceptInviteForm
            token={token}
            email={user.email}
            subdomain={tenant?.subdomain}
          />
        </div>
      </div>
    </div>
  );
}
