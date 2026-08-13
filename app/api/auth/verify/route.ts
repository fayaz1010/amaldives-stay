import { NextRequest, NextResponse } from 'next/server';
import { consumeVerificationToken } from '@/lib/send-signup-verification';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rl = await rateLimit(`verify:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests();

  const token = request.nextUrl.searchParams.get('token') ?? '';
  const email = (request.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase();
  const base = process.env.NEXTAUTH_URL || 'https://vayves.com';

  if (!token || !email) {
    return NextResponse.redirect(`${base}/auth/signin?verify=invalid`);
  }

  const result = await consumeVerificationToken(email, token);
  return NextResponse.redirect(`${base}/auth/signin?verify=${result === 'ok' ? 'done' : result}`);
}
