import { getResend } from '@/lib/email';
import { claimVerificationHtml } from '@/lib/email-templates';

export async function sendClaimVerificationEmail(args: {
  to: string;
  guesthouseName: string;
  verifyUrl: string;
  ttlMs: number;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('[claim-verify] email not configured');
    return { sent: false, reason: 'no_api_key' };
  }

  const client = getResend();
  if (!client) return { sent: false, reason: 'no_api_key' };

  const hours = Math.round(args.ttlMs / (60 * 60 * 1000));

  try {
    const result = await client.emails.send({
      from: `amaldives STAY <${process.env.RESEND_FROM_EMAIL}>`,
      to: args.to,
      subject: `Verify ownership — ${args.guesthouseName}`,
      html: claimVerificationHtml({
        guesthouseName: args.guesthouseName,
        verifyUrl: args.verifyUrl,
        expiresIn: hours <= 1 ? '1 hour' : `${hours} hours`,
      }),
    });
    if ((result as { error?: unknown })?.error) {
      return { sent: false, reason: 'resend_error' };
    }
    return { sent: true };
  } catch (err) {
    console.warn('[claim-verify] send failed', err);
    return { sent: false, reason: 'exception' };
  }
}
