import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { HousekeepingBoard } from '@/components/admin/housekeeping-board';

export const dynamic = 'force-dynamic';

export default async function HousekeepingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const [tasks, rooms] = await Promise.all([
    db.getHousekeepingTasks({}),
    db.getRooms(),
  ]);

  return <HousekeepingBoard tasks={tasks} rooms={rooms} />;
}
