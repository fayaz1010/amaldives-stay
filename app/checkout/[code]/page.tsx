import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { normalizeCheckInScanCode } from '@/lib/checkin-out-config';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];

export default async function CheckoutCodePage({
  params,
}: {
  params: { code: string };
}) {
  const code = normalizeCheckInScanCode(params.code);
  const session = await getServerSession(authOptions);

  if (session?.user?.role && STAFF_ROLES.includes(session.user.role)) {
    redirect(`/admin/checkin?code=${encodeURIComponent(code)}`);
  }

  redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/admin/checkin?code=${code}`)}`);
}
