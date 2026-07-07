/**
 * Detects "please confirm this forwarding address" emails (Gmail, Outlook,
 * Yahoo, etc.) landing at a tenant's ota-<subdomain>@<domain> ingest
 * address. Tenants set up an inbox filter that forwards OTA emails to us
 * (see the Channel Manager "Auto-import by email" card) — most webmail
 * providers require confirming the target address first, and since that
 * target is OUR mailbox, the tenant can't see the confirmation code
 * themselves. We extract it here so it can be surfaced back to them in the
 * admin UI instead of being silently swallowed as an unparseable OTA email.
 */
import type { RawEmail } from '@/lib/ota-email-parse';

export interface ForwardConfirmation {
  provider: 'gmail' | 'outlook' | 'yahoo' | 'other';
  code: string | null;
  link: string | null;
  receivedAt: string;
}

const SENDER_PROVIDER: Array<{ pattern: RegExp; provider: ForwardConfirmation['provider'] }> = [
  { pattern: /forwarding-noreply@google\.com/i, provider: 'gmail' },
  { pattern: /@microsoft\.com|outlook\.com/i, provider: 'outlook' },
  { pattern: /@yahoo-inc\.com|yahoo\.com/i, provider: 'yahoo' },
];

/** Returns a ForwardConfirmation if this email looks like a mail-forwarding
 *  verification message, else null (meaning: process as a normal OTA email). */
export function detectForwardingConfirmation(email: RawEmail): ForwardConfirmation | null {
  const subject = email.subject || '';
  const looksLikeConfirmation =
    /forwarding confirmation/i.test(subject) ||
    /confirm.{0,20}forward/i.test(subject) ||
    /verify.{0,20}forward/i.test(subject);
  if (!looksLikeConfirmation) return null;

  const from = email.from || '';
  const provider = SENDER_PROVIDER.find((p) => p.pattern.test(from))?.provider ?? 'other';

  const body = (email.text && email.text.trim()) || (email.html || '').replace(/<[^>]+>/g, ' ');

  const codeMatch = body.match(/confirmation code[^\n:]*[:\s]+([A-Za-z0-9-]{4,32})/i);
  const linkMatch = body.match(/https?:\/\/\S*(?:mail-settings\.google\.com|confirm)\S*/i);

  return {
    provider,
    code: codeMatch ? codeMatch[1].trim() : null,
    link: linkMatch ? linkMatch[0].replace(/[)\].,]+$/, '') : null,
    receivedAt: new Date().toISOString(),
  };
}
