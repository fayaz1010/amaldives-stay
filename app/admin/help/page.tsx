import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminHelpPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { subdomain: true, domain: true },
  });

  const q = new URLSearchParams();
  if (tenant?.subdomain) q.set('subdomain', tenant.subdomain);
  if (tenant?.domain) q.set('domain', tenant.domain);

  const src = `/help/vayves-backend.html?${q.toString()}`;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] -m-4 md:-m-6">
      <iframe
        src={src}
        title="Vayves backend help"
        className="w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
