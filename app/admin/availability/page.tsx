import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AvailabilityCalendar } from '@/components/admin/availability-calendar';

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  return (
    <div className="p-6">
      <AvailabilityCalendar />
    </div>
  );
}
