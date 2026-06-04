import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DomainConnect } from '@/components/admin/domain-connect';
import { EmailSetup } from '@/components/admin/email-setup';

export const dynamic = 'force-dynamic';

export default async function DomainPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Domain &amp; email</h1>
        <p className="text-gray-500 text-sm mt-1">
          Put your booking website on your own domain and get professional email on it — guests book direct, you keep
          the commission.
        </p>
      </div>
      <DomainConnect />
      <EmailSetup />
    </div>
  );
}
