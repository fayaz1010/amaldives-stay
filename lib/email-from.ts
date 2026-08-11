// Single source of truth for the Vayves transactional sender identity.
// vayves.com is DKIM/SPF-verified in Resend (records live in the Cloudflare
// zone). A stale RESEND_FROM_EMAIL pointing at another domain would fail DKIM
// alignment, so only honour the env override when it is a vayves.com address.
const envFrom = process.env.RESEND_FROM_EMAIL;

export const VAYVES_FROM_EMAIL =
  envFrom && envFrom.trim().toLowerCase().endsWith('@vayves.com')
    ? envFrom.trim()
    : 'hello@vayves.com';

// vayves.com inbound routes via Cloudflare Email Routing; replies also go to
// the monitored partnerships inbox on amaldives.com (staffed pipeline).
export const VAYVES_REPLY_TO =
  process.env.RESEND_REPLY_TO?.trim() || 'partnerships@amaldives.com';

export function vayvesFrom(displayName = 'Vayves'): string {
  return `${displayName} <${VAYVES_FROM_EMAIL}>`;
}
