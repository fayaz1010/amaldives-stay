import { NextRequest, NextResponse } from 'next/server';
import { syncArrivalEtasFromFlightBoard } from '@/lib/flight-arrival-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron entrypoint — invoked by Vercel Cron Jobs hourly (see vercel.json).
 * Reconciles ArrivalRecord ETAs against the Malé arrivals board.
 *
 * Security: Vercel Cron requests carry an Authorization: Bearer
 * ${CRON_SECRET} header. We reject anything else so the URL can't be
 * triggered directly.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  try {
    const result = await syncArrivalEtasFromFlightBoard();
    return NextResponse.json({
      success: true,
      durationMs: Date.now() - t0,
      ...result,
    });
  } catch (error) {
    console.error('Cron sync-arrival-flights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
