import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { provisionAllGuesthouses } from '@/lib/auto-provision-guesthouse';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Cron — auto-provision Vayves tenants for amaldives.com guesthouses that
 * have a verifiable business email or website on file.
 */
export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

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
