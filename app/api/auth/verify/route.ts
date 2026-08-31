import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { consumeVerificationToken } from '@/lib/send-signup-verification';
import { notifyHqLead } from '@/lib/ozsystems-lead';
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

  // A confirmed address is the earliest point this is worth calling a lead.
  // Firing at signup instead sent 251 unconfirmed bot signups to HQ.
  if (result === 'ok') {
    const user = await prisma.user
      .findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { name: true },
      })
      .catch(() => null);

    await notifyHqLead({
      intent: 'signup',
      name: user?.name ?? email.split('@')[0],
      email,
      metadata: { entry_point: 'auth_signup', role: 'GUEST', email_verified: true },
    });
  }

  return NextResponse.redirect(`${base}/auth/signin?verify=${result === 'ok' ? 'done' : result}`);
}
