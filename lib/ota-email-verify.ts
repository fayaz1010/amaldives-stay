/**
 * Gemini verification round for OTA booking emails.
 *
 * lib/ota-email-parse.ts does a cheap, deterministic regex pass first (it's
 * often exactly right and costs nothing). This module then ALWAYS asks
 * Gemini to independently read the raw email — not just format-check the
 * regex output — and return what it believes the correct reservation
 * details are. We diff Gemini's read against the regex candidate; a
 * booking is only auto-created when Gemini is confident AND there's no
 * unresolved disagreement on the essentials (OTA reference + date range).
 * Everything else (including emails regex found nothing in at all) is
 * queued for a human to confirm in the OTA review queue.
 *
 * This also makes every inbound email — auto-applied or queued — a
 * labeled example (raw email → regex guess → AI read → human-confirmed
 * final) that can later train a dedicated small extraction model per OTA,
 * once more properties are onboarded.
 */
import { generateJSON } from '@/lib/ai';
import { htmlToText, type OtaEmailAction, type OtaSource, type ParsedOtaEmail, type RawEmail } from '@/lib/ota-email-parse';

export interface OtaVerificationDiscrepancy {
  field: string;
  regexValue: unknown;
  aiValue: unknown;
}

export interface OtaVerificationResult {
  /** true only when Gemini found the essentials with high confidence and no unresolved discrepancy. */
  verified: boolean;
  confidence: number;
  /** Gemini's reconciled reservation details, ready for ingestOtaEmailBooking. Null if Gemini couldn't determine the essentials either. */
  final: ParsedOtaEmail | null;
  discrepancies: OtaVerificationDiscrepancy[];
  /** Raw Gemini response (or null if the call failed/was skipped) — stored for audit/training data. */
  aiRaw: Record<string, unknown> | null;
  /** Set when Gemini couldn't be reached at all (no key, network error, bad response). Falls back to regex-only. */
  aiError?: string;
}

interface GeminiOtaResponse {
  source?: string | null;
  action?: string | null;
  otaRef?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkIn?: string | null; // ISO yyyy-mm-dd
  checkOut?: string | null; // ISO yyyy-mm-dd
  roomHint?: string | null;
  adults?: number | null;
  children?: number | null;
  amount?: number | null;
  confidence?: number | null;
}

const VALID_SOURCES: OtaSource[] = ['booking.com', 'airbnb', 'agoda', 'expedia', 'vrbo', 'ota'];
const VALID_ACTIONS: OtaEmailAction[] = ['new', 'modified', 'cancelled'];
const COMPARE_FIELDS = [
  'otaRef', 'guestName', 'guestEmail', 'guestPhone', 'checkIn', 'checkOut', 'roomHint', 'adults', 'children', 'amount',
] as const;

function isoDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return isNaN(dt.getTime()) ? null : dt;
}

function normalize(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v === undefined) return null;
  if (typeof v === 'string') return v.trim().toLowerCase();
  return v;
}

function fieldsDiffer(a: unknown, b: unknown): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === null || nb === null) return false; // one side missing isn't a "disagreement", just a gap we fill
  return na !== nb;
}

/**
 * Always runs Gemini against the raw email (independent read), reconciles
 * it against the regex candidate, and returns the authoritative result.
 * Never throws — on any AI failure it degrades to the regex candidate
 * (marked unverified) so the caller can route it to manual review.
 */
export async function verifyOtaEmail(
  email: RawEmail,
  regexCandidate: ParsedOtaEmail | null,
  tenantId?: string
): Promise<OtaVerificationResult> {
  const body = (email.text && email.text.trim()) ? email.text : htmlToText(email.html || '');

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.UTIL_AI_URL) {
    return {
      verified: false,
      confidence: 0,
      final: regexCandidate,
      discrepancies: [],
      aiRaw: null,
      aiError: 'no_ai_configured',
    };
  }

  try {
    const ai = await generateJSON<GeminiOtaResponse>(
      [
        {
          text:
            `You are verifying a booking extracted from an OTA (Online Travel Agency) reservation ` +
            `notification email for a hotel/guesthouse. Read the RAW EMAIL below yourself and work out ` +
            `the true reservation details — do not just trust the "candidate" values, they may be wrong ` +
            `or incomplete; your job is to independently confirm or correct them.\n\n` +
            `Return ONLY a JSON object with these fields (use null for anything you cannot determine ` +
            `with confidence from the email text — never guess):\n` +
            `{\n` +
            `  "source": "booking.com" | "airbnb" | "agoda" | "expedia" | "vrbo" | "ota",\n` +
            `  "action": "new" | "modified" | "cancelled",\n` +
            `  "otaRef": string | null,          // the OTA's reservation/confirmation number\n` +
            `  "guestName": string | null,\n` +
            `  "guestEmail": string | null,      // never the OTA's own no-reply address\n` +
            `  "guestPhone": string | null,\n` +
            `  "checkIn": "YYYY-MM-DD" | null,\n` +
            `  "checkOut": "YYYY-MM-DD" | null,\n` +
            `  "roomHint": string | null,        // room/unit type as described in the email\n` +
            `  "adults": number | null,\n` +
            `  "children": number | null,\n` +
            `  "amount": number | null,          // total price/payout, currency dropped\n` +
            `  "confidence": number              // 0 to 1: how confident you are in otaRef + dates being correct\n` +
            `}\n\n` +
            `Candidate values a simple regex parser already extracted (for reference only — verify, don't defer to them):\n` +
            `${JSON.stringify(regexCandidate ?? { note: 'regex found nothing' })}\n\n` +
            `Subject: ${email.subject || '(none)'}\n` +
            `From: ${email.from || '(unknown)'}\n\n` +
            `RAW EMAIL:\n${body.slice(0, 6000)}`,
        },
      ],
      { temperature: 0.1, maxTokens: 700 }
    );

    return reconcile(regexCandidate, ai);
  } catch (err) {
    return {
      verified: false,
      confidence: 0,
      final: regexCandidate,
      discrepancies: [],
      aiRaw: null,
      aiError: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Recompute the reconciled/merged reservation struct from stored regex +
 * raw-AI JSON (e.g. when re-rendering a queued OtaEmailMessage for the
 * admin review screen, or building sensible defaults for the approve form).
 */
export function reconcileStoredExtraction(
  regexResult: unknown,
  aiResult: unknown
): OtaVerificationResult {
  const regex = (regexResult ?? null) as ParsedOtaEmail | null;
  if (regex) {
    if (typeof regex.checkIn === 'string') regex.checkIn = new Date(regex.checkIn);
    if (typeof regex.checkOut === 'string') regex.checkOut = new Date(regex.checkOut);
  }
  const ai = (aiResult ?? {}) as GeminiOtaResponse;
  return reconcile(regex, ai);
}

function reconcile(regex: ParsedOtaEmail | null, ai: GeminiOtaResponse): OtaVerificationResult {
  const aiRaw = ai as unknown as Record<string, unknown>;
  const confidence = typeof ai.confidence === 'number' ? Math.max(0, Math.min(1, ai.confidence)) : 0;

  const source: OtaSource = VALID_SOURCES.includes((ai.source ?? '') as OtaSource)
    ? (ai.source as OtaSource)
    : regex?.source ?? 'ota';
  const action: OtaEmailAction = VALID_ACTIONS.includes((ai.action ?? '') as OtaEmailAction)
    ? (ai.action as OtaEmailAction)
    : regex?.action ?? 'new';

  const merged: ParsedOtaEmail = {
    source,
    action,
    otaRef: (ai.otaRef ?? regex?.otaRef ?? '') || '',
    guestName: ai.guestName ?? regex?.guestName ?? null,
    guestEmail: ai.guestEmail ?? regex?.guestEmail ?? null,
    guestPhone: ai.guestPhone ?? regex?.guestPhone ?? null,
    checkIn: isoDate(ai.checkIn) ?? regex?.checkIn ?? null,
    checkOut: isoDate(ai.checkOut) ?? regex?.checkOut ?? null,
    roomHint: ai.roomHint ?? regex?.roomHint ?? null,
    adults: typeof ai.adults === 'number' ? ai.adults : regex?.adults ?? null,
    children: typeof ai.children === 'number' ? ai.children : regex?.children ?? null,
    amount: typeof ai.amount === 'number' ? ai.amount : regex?.amount ?? null,
  };

  const discrepancies: OtaVerificationDiscrepancy[] = [];
  if (regex) {
    for (const field of COMPARE_FIELDS) {
      const aiValue = (ai as Record<string, unknown>)[field];
      const regexValue = (regex as unknown as Record<string, unknown>)[field];
      if (field === 'checkIn' || field === 'checkOut') {
        const aiDate = isoDate(aiValue as string | null);
        const regexDate = regexValue as Date | null;
        if (aiDate && regexDate && aiDate.getTime() !== regexDate.getTime()) {
          discrepancies.push({ field, regexValue: regexDate?.toISOString().slice(0, 10) ?? null, aiValue: aiDate.toISOString().slice(0, 10) });
        }
        continue;
      }
      if (fieldsDiffer(regexValue, aiValue)) {
        discrepancies.push({ field, regexValue, aiValue });
      }
    }
  }

  const hasEssentials = !!merged.otaRef && (action === 'cancelled' || (!!merged.checkIn && !!merged.checkOut && merged.checkOut > merged.checkIn));
  // Auto-apply only when Gemini is confident, has the essentials, and didn't
  // disagree with regex on anything we can't just take the AI's word for
  // (date/ref mismatches are the ones that matter — contact-detail
  // disagreements are fine to silently prefer the AI's read on).
  const criticalDiscrepancy = discrepancies.some((d) => d.field === 'otaRef' || d.field === 'checkIn' || d.field === 'checkOut');
  const verified = hasEssentials && confidence >= 0.7 && !criticalDiscrepancy;

  return {
    verified,
    confidence,
    final: hasEssentials ? merged : null,
    discrepancies,
    aiRaw,
  };
}
