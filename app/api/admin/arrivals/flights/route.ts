/**
 * GET /api/admin/arrivals/flights — live (or demo) flight arrivals board for
 * Velana International (MLE), for transfer/pickup planning.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMaleArrivals } from '@/lib/flights';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const board = await getMaleArrivals();
  return NextResponse.json(board);
}
