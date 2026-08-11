import { NextRequest, NextResponse } from 'next/server';

/**
 * Hard gate for cron routes. Fails CLOSED: if CRON_SECRET is not configured,
 * the route returns 503 instead of becoming public (provision-guesthouses
 * batch-creates tenants + Vercel domains — it must never be open).
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
