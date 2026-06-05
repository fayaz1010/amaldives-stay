import { generateJSON } from '@/lib/ai';
import { buildPropertyKnowledge } from '@/lib/property-knowledge';

export interface ExtractedOtaGuest {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  confidence: 'regex' | 'ai' | 'none';
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,4}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}(?:[\s-]?\d{2,4})?/;

/** Regex-first extraction from OTA iCal SUMMARY / DESCRIPTION text. */
export function extractGuestFromIcalText(
  summary?: string | null,
  description?: string | null
): ExtractedOtaGuest {
  const blob = [summary, description].filter(Boolean).join('\n');
  if (!blob.trim()) {
    return { confidence: 'none' };
  }

  const emailMatch = blob.match(EMAIL_RE);
  const phoneMatch = blob.match(PHONE_RE);

  let guestName: string | undefined;
  const namePatterns = [
    /(?:guest|name|booker|reserved for)[:\s]+([^\n,;|]+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-–]\s*\d/,
  ];
  for (const p of namePatterns) {
    const m = blob.match(p);
    if (m?.[1]) {
      guestName = m[1].trim().slice(0, 120);
      break;
    }
  }

  if (emailMatch || phoneMatch || guestName) {
    return {
      guestName,
      guestEmail: emailMatch?.[0],
      guestPhone: phoneMatch?.[0],
      confidence: 'regex',
    };
  }

  return { confidence: 'none' };
}

/** Use Gemini when regex fails — batch-friendly for cron sync. */
export async function extractGuestWithAi(
  summary?: string | null,
  description?: string | null,
  source?: string,
  tenantId?: string
): Promise<ExtractedOtaGuest> {
  const regex = extractGuestFromIcalText(summary, description);
  if (regex.confidence !== 'none' && (regex.guestEmail || regex.guestName)) {
    return regex;
  }

  const text = [summary, description].filter(Boolean).join('\n').trim();
  if (!text || text.length < 8) return regex;

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.UTIL_AI_URL) {
    return regex;
  }

  try {
    const propertyContext = tenantId ? await buildPropertyKnowledge(tenantId) : '';
    const result = await generateJSON<{
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
    }>(
      [
        {
          text:
            `Extract guest contact details from this ${source ?? 'OTA'} calendar event. ` +
            `Return JSON: { "guestName", "guestEmail", "guestPhone" } with null for unknown.\n\n` +
            (propertyContext ? `Property context (for name disambiguation):\n${propertyContext.slice(0, 800)}\n\n` : '') +
            text.slice(0, 2000),
        },
      ],
      { temperature: 0.1, maxTokens: 256 }
    );

    return {
      guestName: result.guestName ?? undefined,
      guestEmail: result.guestEmail ?? undefined,
      guestPhone: result.guestPhone ?? undefined,
      confidence: 'ai',
    };
  } catch {
    return regex;
  }
}
