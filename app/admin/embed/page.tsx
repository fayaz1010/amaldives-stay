import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EmbedKit } from '@/components/admin/embed-kit';

export const dynamic = 'force-dynamic';

export default async function AdminEmbedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { subdomain: true, amaldivesSlug: true, theme: true, name: true },
  });
  if (!tenant) redirect('/auth/signin');

  const theme = (tenant.theme ?? {}) as { primaryColor?: string };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add booking to your website</h1>
      <p className="text-gray-500 text-sm mb-8">
        Simple copy-paste tools for {tenant.name} — made for non-technical owners.
      </p>
      <EmbedKit
        subdomain={tenant.subdomain}
        primaryColor={theme.primaryColor}
        amaldivesSlug={tenant.amaldivesSlug}
      />
    </div>
  );
}
