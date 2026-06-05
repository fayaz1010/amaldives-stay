import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isStripeConfigured } from '@/lib/stripe';
import { PaymentsSettings } from '@/components/admin/payments-settings';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PaymentsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const allowed = ['TENANT_ADMIN', 'MANAGER'];
  if (!allowed.includes(session.user.role)) redirect('/unauthorized');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { subdomain: true, settings: true },
  });
  if (!tenant) redirect('/auth/signin');

  return (
    <div className="p-6 max-w-3xl">
      <Link href="/admin/settings">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1 text-gray-600">
          <ChevronLeft className="h-4 w-4" />
          Back to settings
        </Button>
      </Link>
      <PaymentsSettings
        tenant={tenant}
        stripePlatformConfigured={isStripeConfigured()}
      />
    </div>
  );
}
