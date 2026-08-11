import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { sendPendingNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const t0 = Date.now();
  const result = await sendPendingNotifications();

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - t0,
    ...result,
  });
}
