/**
 * OTA booking-email parser.
 *
 * Turns a raw inbound notification email (forwarded from an OTA via a
 * Cloudflare Email Worker) into a normalised reservation struct that
 * lib/ota-email-ingest.ts can create/update/cancel a Booking from.
 *
 * Design notes:
 *  - We never touch the tenant's own mailbox. The OTA is configured to send
 *    a COPY of each notification to an address on our platform domain, which
 *    Cloudflare routes here. So this only ever sees a duplicate.
 *  - Parsing OTA HTML is inherently fragile; we strip to text and use tolerant
 *    regexes, and we REQUIRE the two non-negotiables (an OTA reference + a
 *    valid date range) before we'll create anything. If those are missing we
 *    return null and the webhook records it for manual review rather than
 *    guessing.
 */

export type OtaSource = 'booking.com' | 'airbnb' | 'agoda' | 'expedia' | 'vrbo' | 'ota';

export type OtaEmailAction = 'new' | 'modified' | 'cancelled';

export interface ParsedOtaEmail {
  source: OtaSource;
  action: OtaEmailAction;
  /** Stable OTA reservation reference — the dedupe key. */
  otaRef: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  /** Free-text room description from the email, used to map to a room. */
  roomHint: string | null;
  adults: number | null;
  children: number | null;
  /** Total payout/amount if present (number only, currency dropped). */
  amount: number | null;
}

export interface RawEmail {
  from: string;
  to: string;
  subject: string;
  text?: string | null;
  html?: string | null;
}

/** Strip HTML to readable text: drop scripts/styles, tags → spaces, decode a
 *  few common entities, collapse whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function detectSource(email: RawEmail): OtaSource {
  const hay = `${email.from} ${email.subject}`.toLowerCase();
  if (/booking\.com/.test(hay)) return 'booking.com';
  if (/airbnb/.test(hay)) return 'airbnb';
  if (/agoda/.test(hay)) return 'agoda';
  if (/expedia/.test(hay)) return 'expedia';
  if (/vrbo|homeaway/.test(hay)) return 'vrbo';
  return 'ota';
}

function detectAction(subject: string, body: string): OtaEmailAction {
  const hay = `${subject}\n${body}`.toLowerCase();
  if (/\b(cancell?ed|cancellation)\b/.test(hay)) return 'cancelled';
  if (/\b(modif|amend|changed|updated reservation|date change)\b/.test(hay)) return 'modified';
  return 'new';
}

/** Pull the first capture group of the first matching regex, trimmed. */
function first(body: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = body.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse a single date from a fragment, tolerating "20 June 2026",
 *  "June 20, 2026", "Fri, 20 Jun 2026", "2026-06-20", "20/06/2026". */
export function parseLooseDate(fragment: string): Date | null {
  if (!fragment) return null;
  const s = fragment.trim();

  // ISO yyyy-mm-dd
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return mkUtc(+m[1], +m[2] - 1, +m[3]);

  // "20 June 2026" / "20 Jun 2026"
  m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) {
    return mkUtc(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
  }

  // "June 20, 2026" / "Jun 20 2026"
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()] !== undefined) {
    return mkUtc(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]);
  }

  // dd/mm/yyyy (OTA emails outside the US are day-first)
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return mkUtc(+m[3], +m[2] - 1, +m[1]);

  return null;
}

function mkUtc(y: number, mo: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, mo, d));
  return isNaN(dt.getTime()) ? null : dt;
}

function toNum(s: string | null): number | null {
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}

/**
 * Main entry: parse a raw OTA email into a normalised reservation, or null
 * if the essentials (reference + dates) can't be found.
 */
export function parseOtaEmail(email: RawEmail): ParsedOtaEmail | null {
  const source = detectSource(email);
  const body = (email.text && email.text.trim())
    ? email.text
    : htmlToText(email.html || '');
  const subject = email.subject || '';
  const action = detectAction(subject, body);

  const otaRef = first(body, [
    /(?:reservation|booking|confirmation)\s*(?:number|no\.?|id|#|code)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})/i,
    /\bconfirmation code\s*[:#]?\s*([A-Z0-9]{6,})/i, // Airbnb: HMABCDEF
    /\b(\d{9,12})\b/, // Booking.com bare 10-digit reservation number fallback
  ]) || first(subject, [/\b([A-Z0-9]{6,})\b/]);

  const guestName = first(body, [
    /guest(?:'s)?\s*name\s*[:#]?\s*([A-Za-z][A-Za-z .'-]{1,60})/i,
    /\bbooker(?:'s)?\s*name\s*[:#]?\s*([A-Za-z][A-Za-z .'-]{1,60})/i,
    /\bname\s*[:#]\s*([A-Za-z][A-Za-z .'-]{1,60})/i,
  ]);

  const guestEmail = first(body, [
    /guest[^@\n]{0,20}([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
    /\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i,
  ]);
  // Don't capture the OTA's own no-reply address as the guest email.
  const cleanGuestEmail = guestEmail && !/booking\.com|airbnb|agoda|expedia|vrbo|noreply|no-reply/i.test(guestEmail)
    ? guestEmail
    : null;

  const guestPhone = first(body, [
    /(?:phone|tel|mobile)\s*[:#]?\s*(\+?[\d][\d\s().-]{6,})/i,
  ]);

  const checkInRaw = first(body, [
    /check[\s-]?in\s*(?:date)?\s*[:#]?\s*([^\n]{6,40})/i,
    /arrival\s*[:#]?\s*([^\n]{6,40})/i,
  ]);
  const checkOutRaw = first(body, [
    /check[\s-]?out\s*(?:date)?\s*[:#]?\s*([^\n]{6,40})/i,
    /departure\s*[:#]?\s*([^\n]{6,40})/i,
  ]);

  const checkIn = checkInRaw ? parseLooseDate(checkInRaw) : null;
  const checkOut = checkOutRaw ? parseLooseDate(checkOutRaw) : null;

  const roomHint = first(body, [
    /room\s*(?:type)?\s*[:#]\s*([A-Za-z][A-Za-z0-9 .,'/&-]{2,60})/i,
    /accommodation\s*[:#]\s*([A-Za-z][A-Za-z0-9 .,'/&-]{2,60})/i,
    /unit\s*[:#]\s*([A-Za-z][A-Za-z0-9 .,'/&-]{2,60})/i,
  ]);

  const adults = toNum(first(body, [/(\d+)\s*adults?/i, /adults?\s*[:#]?\s*(\d+)/i]));
  const children = toNum(first(body, [/(\d+)\s*child(?:ren)?/i, /child(?:ren)?\s*[:#]?\s*(\d+)/i]));
  const amount = (() => {
    const a = first(body, [
      /(?:total(?:\s*price|\s*amount|\s*payout)?|payout|grand total)\s*[:#]?\s*[A-Z$€£]{0,3}\s*([\d,]+(?:\.\d{2})?)/i,
    ]);
    if (!a) return null;
    const n = parseFloat(a.replace(/,/g, ''));
    return isNaN(n) ? null : n;
  })();

  // Non-negotiables. Cancellations only need a ref (we look up the booking).
  if (!otaRef) return null;
  if (action !== 'cancelled' && (!checkIn || !checkOut)) return null;

  return {
    source,
    action,
    otaRef,
    guestName,
    guestEmail: cleanGuestEmail,
    guestPhone,
    checkIn,
    checkOut,
    roomHint,
    adults,
    children,
    amount,
  };
}
