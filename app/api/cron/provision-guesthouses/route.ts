import { NextRequest, NextResponse } from 'next/server';
import { provisionAllGuesthouses } from '@/lib/auto-provision-guesthouse';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Cron — auto-provision Vayves tenants for amaldives.com guesthouses that
 * have a verifiable business email or website on file.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const results = await provisionAllGuesthouses(25);
  const created = results.filter((r) => r.status === 'created').length;

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - t0,
    processed: results.length,
    created,
    results,
  });
}
