import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { canonicalEmail } from '@/lib/email-canonical';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import {
  createSignupVerification,
  sendSignupVerificationEmail,
} from '@/lib/send-signup-verification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/resend-verification  { email }
 *
 * Re-sends the "Confirm your email" link for an unconfirmed self-signup.
 * The reply is the same whether or not the address exists, so this cannot be
 * used to discover registered emails.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = await rateLimit(`resend-verify:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests();

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
  const typed = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const generic = NextResponse.json({
    message: 'If that account is waiting for confirmation, a new link is on its way.',
  });
  if (!typed) return generic;

  const canonical = canonicalEmail(typed);
  const perEmail = await rateLimit(`resend-verify-email:${canonical}`, 3, 60 * 60 * 1000);
  if (!perEmail.ok) return generic;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: canonical, mode: 'insensitive' } },
          { email: { equals: typed, mode: 'insensitive' } },
        ],
      },
      select: { email: true, name: true, emailVerified: true },
    });
    if (user?.email && !user.emailVerified) {
      const email = user.email.toLowerCase();
      const token = await createSignupVerification(email);
      await sendSignupVerificationEmail({ to: email, name: user.name ?? '', token });
    }
  } catch (err) {
    console.error('[resend-verification] failed:', err);
  }
  return generic;
}
