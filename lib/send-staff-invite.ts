/**
 * Send a staff invitation email via Resend.
 *
 * Gracefully degrades when RESEND_API_KEY isn't configured (e.g., in dev
 * or before the env var has been added): logs a warning and returns
 * { sent: false, reason }. The API caller still gets the invite URL in
 * the JSON response so they can copy-paste it manually.
 */
import { getResend } from '@/lib/email';
import { VAYVES_FROM_EMAIL, VAYVES_REPLY_TO } from './email-from';
import { staffInviteHtml } from '@/lib/email-templates';

interface Args {
  to: string;
  recipientName: string;
  tenantName: string;
  inviterName: string;
  role: string;
  position: string;
  department: string;
  inviteUrl: string;
  /** ms until token expiry. Used to compute the "expires in" copy. */
  ttlMs: number;
}

export interface SendResult {
  sent: boolean;
  reason?: string;
  id?: string;
}

function formatTtl(ms: number): string {
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'less than a day';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export async function sendStaffInviteEmail(args: Args): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[invite] RESEND_API_KEY not set — skipping email send');
    return { sent: false, reason: 'no_api_key' };
  }
  const from = VAYVES_FROM_EMAIL;

  const client = getResend();
  if (!client) {
    return { sent: false, reason: 'no_api_key' };
  }

  try {
    const result = await client.emails.send({
      from: `Vayves <${from}>`,
    replyTo: VAYVES_REPLY_TO,
      to: args.to,
      subject: `You're invited to ${args.tenantName} on Vayves`,
      html: staffInviteHtml({
        recipientName: args.recipientName,
        tenantName: args.tenantName,
        inviterName: args.inviterName,
        role: args.role,
        position: args.position,
        department: args.department,
        inviteUrl: args.inviteUrl,
        expiresIn: formatTtl(args.ttlMs),
      }),
    });
    if ((result as any)?.error) {
      console.warn('[invite] resend reported error', (result as any).error);
      return { sent: false, reason: 'resend_error' };
    }
    return { sent: true, id: (result as any)?.data?.id };
  } catch (err) {
    console.warn('[invite] send failed', err);
    return { sent: false, reason: 'exception' };
  }
}
