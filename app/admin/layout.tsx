
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/auth/signin');

  const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'OWNER'];
  if (!session.user || !allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized');
  }

  // Fetch tenant plan + branding for feature gating and sidebar display.
  const tenant = session.user.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { plan: true, name: true, subdomain: true, logo: true, theme: true },
      })
    : null;

  const theme = (tenant?.theme as Record<string, unknown> | null) ?? {};
  const primaryColor = typeof theme.primaryColor === 'string' ? theme.primaryColor : null;

  return (
    <AdminLayout
      user={session.user}
      tenantPlan={tenant?.plan ?? 'basic'}
      tenantSubdomain={tenant?.subdomain ?? ''}
      tenantName={tenant?.name ?? ''}
      tenantLogo={tenant?.logo ?? null}
      primaryColor={primaryColor}
    >
      {children}
    </AdminLayout>
  );
}
