import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { markCheckoutReadyForTenant } from '@/lib/checkout-ready';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
