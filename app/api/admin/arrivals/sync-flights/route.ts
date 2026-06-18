/**
 * POST /api/admin/arrivals/sync-flights — manual trigger for the same job the
 * hourly cron runs. Reconciles ArrivalRecord ETAs against the Malé arrivals
 * board so staff can refresh transfer plans on demand.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { syncArrivalEtasFromFlightBoard } from '@/lib/flight-arrival-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await syncArrivalEtasFromFlightBoard();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Arrivals flight-sync POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
