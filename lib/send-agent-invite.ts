import { getResend } from '@/lib/email';
import { staffInviteHtml } from '@/lib/email-templates';

interface Args {
  to: string;
  recipientName: string;
  tenantName: string;
  inviterName: string;
  agencyName: string;
  inviteUrl: string;
  ttlMs: number;
}

export async function sendAgentInviteEmail(args: Args) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { sent: false, reason: 'no_email_config' as const };
  }
  const client = getResend();
  if (!client) return { sent: false, reason: 'no_api_key' as const };

  const days = Math.round(args.ttlMs / (24 * 60 * 60 * 1000));
  const expiresIn = days <= 1 ? '1 day' : `${days} days`;

  try {
    await client.emails.send({
      from: `Vayves <${process.env.RESEND_FROM_EMAIL}>`,
      to: args.to,
      subject: `Agent portal access — ${args.agencyName}`,
      html: staffInviteHtml({
        recipientName: args.recipientName,
        tenantName: args.tenantName,
        inviterName: args.inviterName,
        role: 'Travel Agent',
        position: args.agencyName,
        department: 'B2B',
        inviteUrl: args.inviteUrl,
        expiresIn,
      }),
    });
    return { sent: true };
  } catch {
    return { sent: false, reason: 'send_failed' as const };
  }
}
