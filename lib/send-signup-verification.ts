import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getResend } from '@/lib/email';
import { vayvesFrom, VAYVES_REPLY_TO } from './email-from';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createSignupVerification(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

export async function sendSignupVerificationEmail(args: {
  to: string;
  name: string;
  token: string;
}): Promise<{ sent: boolean }> {
  const client = getResend();
  if (!client) return { sent: false };

  const base = process.env.NEXTAUTH_URL || 'https://vayves.com';
  const url = `${base}/api/auth/verify?token=${args.token}&email=${encodeURIComponent(args.to)}`;

  try {
    const result = await client.emails.send({
      from: vayvesFrom(),
      replyTo: VAYVES_REPLY_TO,
      to: args.to,
      subject: 'Confirm your email — Vayves',
      html: [
        `<p>Hi ${args.name || 'there'},</p>`,
        `<p>Confirm your email address to activate your Vayves account:</p>`,
        `<p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#0E7C86;color:#fff;border-radius:6px;text-decoration:none">Confirm email</a></p>`,
        `<p>Or open this link: <a href="${url}">${url}</a></p>`,
        `<p>The link expires in 24 hours. If you didn't create an account, ignore this email.</p>`,
      ].join('\n'),
    });
    return { sent: !(result as { error?: unknown })?.error };
  } catch {
    return { sent: false };
  }
}

export async function consumeVerificationToken(
  email: string,
  token: string,
): Promise<'ok' | 'expired' | 'invalid'> {
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.identifier !== email) return 'invalid';
  if (row.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return 'expired';
  }
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.user.updateMany({
      where: { email: { equals: email, mode: 'insensitive' }, emailVerified: null },
      data: { emailVerified: new Date() },
    }),
  ]);
  return 'ok';
}
