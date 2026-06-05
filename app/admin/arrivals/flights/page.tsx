import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MaleArrivalsBoard } from '@/components/admin/male-arrivals-board';

export const dynamic = 'force-dynamic';

export default async function FlightArrivalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');
  return <MaleArrivalsBoard />;
}
