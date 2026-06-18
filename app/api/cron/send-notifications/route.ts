import { NextRequest, NextResponse } from 'next/server';
import { sendPendingNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const result = await sendPendingNotifications();

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - t0,
    ...result,
  });
}
