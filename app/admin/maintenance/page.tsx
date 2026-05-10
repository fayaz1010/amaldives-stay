import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { MaintenanceBoard } from '@/components/admin/maintenance-board';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const [requests, rooms] = await Promise.all([
    db.getMaintenanceRequests({}),
    db.getRooms(),
  ]);

  return <MaintenanceBoard requests={requests} rooms={rooms} />;
}
