import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';
import { PropertiesManager } from '@/components/admin/properties-manager';
import { SharingSettings } from '@/components/admin/sharing-settings';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const [properties, activePropertyId] = await Promise.all([
    prisma.property.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, city: true, address: true, isActive: true,
        taxTin: true, tgstRate: true, greenTaxUsdPerNight: true, serviceChargeRate: true,
        _count: { select: { rooms: true, bookings: true } },
      },
    }),
    getActivePropertyId(session.user.tenantId),
  ]);

  const canManage = ['TENANT_ADMIN', 'OWNER'].includes(session.user.role);

  return (
    <div className="space-y-6">
      <PropertiesManager
        properties={properties}
        activePropertyId={activePropertyId}
        canManage={canManage}
      />
      {properties.length > 1 && canManage && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
          <SharingSettings />
        </div>
      )}
    </div>
  );
}
