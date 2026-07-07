import { NextRequest, NextResponse } from 'next/server';
import { runOtaOnboardingNudge } from '@/lib/ota-onboarding-stall';

export const dynamic = 'force-dynamic';

/** Daily: reminds tenants who never connected an OTA channel, and after a
 *  week escalates to platform ops with a ready-to-send WhatsApp draft. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await runOtaOnboardingNudge();
  return NextResponse.json({ ok: true, ...summary });
}
