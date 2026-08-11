import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/db';
import { markCheckoutReadyForTenant } from '@/lib/checkout-ready';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  let totalMarked = 0;
  for (const t of tenants) {
    const { marked } = await markCheckoutReadyForTenant(t.id);
    totalMarked += marked;
  }

  return NextResponse.json({ ok: true, tenants: tenants.length, marked: totalMarked });
}
