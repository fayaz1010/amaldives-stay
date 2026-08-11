import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { runOtaOnboardingNudge } from '@/lib/ota-onboarding-stall';

export const dynamic = 'force-dynamic';

/** Daily: reminds tenants who never connected an OTA channel, and after a
 *  week escalates to platform ops with a ready-to-send WhatsApp draft. */
export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const summary = await runOtaOnboardingNudge();
  return NextResponse.json({ ok: true, ...summary });
}
