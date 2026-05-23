import { NextRequest, NextResponse } from 'next/server';
import { syncAllFeeds } from '@/lib/ical-sync';

export const dynamic = 'force-dynamic';
// Each feed takes ~1-5s to fetch + parse. With a 4-way concurrency cap
// (see syncAllFeeds) we can comfortably sync ~30 feeds in 60s. If we
// outgrow that we'll partition by tenantId across multiple cron jobs.
export const maxDuration = 60;

/**
 * Cron entrypoint — invoked by Vercel Cron Jobs every 15 minutes (see
 * vercel.json). Iterates every active ExternalCalendarFeed across all
 * tenants and reconciles the iCal contents against ExternalCalendarBlock.
 *
 * Security: Vercel Cron requests carry an Authorization: Bearer
 * ${CRON_SECRET} header (CRON_SECRET is auto-generated for crons). We
 * reject anything else so an attacker can't trigger a sync storm by
 * hitting this URL directly.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const results = await syncAllFeeds({ concurrency: 4 });
  const okCount = results.filter((r) => r.ok).length;
  const totalEvents = results.reduce((sum, r) => sum + r.eventCount, 0);

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - t0,
    feedsTotal: results.length,
    feedsOk: okCount,
    feedsFailed: results.length - okCount,
    totalEvents,
    failures: results.filter((r) => !r.ok).map((r) => ({ feedId: r.feedId, error: r.error })),
  });
}
