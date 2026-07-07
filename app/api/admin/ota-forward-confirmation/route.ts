import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Dismiss the surfaced mail-forwarding confirmation code/link once the tenant has used it. */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { settings: true },
  });
  const settings = { ...((tenant?.settings as Record<string, unknown>) ?? {}) };
  delete settings.otaForwardingConfirmation;

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { settings: settings as never },
  });

  return NextResponse.json({ ok: true });
}
