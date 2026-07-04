// Minimal Gemini 2.5 Flash client for the seed-extraction flow.
//
// Mirrors the amaldives.com sibling site's approach:
//   - API keys come from the central `util-ai` service so all of our
//     properties rotate keys from one source (the util-ai cluster).
//   - We use the bare REST endpoint instead of @google/generative-ai
//     so we don't add a new dependency and we can do streaming or image
//     inputs without wrestling with SDK versions.
//   - response_mime_type: 'application/json' guarantees the model returns
//     parseable JSON (no markdown fences, no preamble).

const UTIL_AI_URL = process.env.UTIL_AI_URL || '';
const UTIL_AI_TOKEN = process.env.UTIL_AI_TOKEN || '';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

interface KeyCacheEntry {
  keys: string[];
  cursor: number;
  expiresAt: number;
}
const KEY_CACHE: Record<string, KeyCacheEntry> = {};
const KEY_TTL_MS = 10 * 60 * 1000;

async function loadGeminiKeys(): Promise<string[]> {
  const now = Date.now();
  const cached = KEY_CACHE.gemini;
  if (cached && cached.expiresAt > now && cached.keys.length > 0) {
    return cached.keys;
  }

  // Production path — pull from util-ai.
  if (UTIL_AI_URL && UTIL_AI_TOKEN) {
    const url = `${UTIL_AI_URL.replace(/\/+$/, '')}/v1/secrets?name=gemini`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${UTIL_AI_TOKEN}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { values?: string[]; keys?: string[] };
      const keys = data.values || data.keys || [];
      if (keys.length > 0) {
        KEY_CACHE.gemini = { keys, cursor: -1, expiresAt: now + KEY_TTL_MS };
        return keys;
      }
    }
  }

  // Local-dev fallback so this code is usable when util-ai is down.
  const envKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (envKeys.length === 0) {
    throw new Error('No Gemini API keys available (util-ai unreachable and no GEMINI_API_KEY env)');
  }
  KEY_CACHE.gemini = { keys: envKeys, cursor: -1, expiresAt: now + KEY_TTL_MS };
  return envKeys;
}

/** Round-robin so a single hot key doesn't shoulder all quota. */
async function getGeminiKey(): Promise<string> {
  const keys = await loadGeminiKeys();
  const cached = KEY_CACHE.gemini;
  cached.cursor = (cached.cursor + 1) % keys.length;
  return keys[cached.cursor];
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GenerateJsonOptions {
  /** When set, the model is constrained to emit JSON matching this schema. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  /** Hint to Gemini that it should ground answers via Google Search. */
  useSearchGrounding?: boolean;
}

/**
 * Send a prompt (text and optionally inline images) to Gemini and parse the
 * JSON response. Throws on any Gemini-side error so callers can map the
 * error to a UI-friendly message.
 */
export async function generateJSON<T = unknown>(
  parts: GeminiPart[],
  options: GenerateJsonOptions = {}
): Promise<T> {
  const keys = await loadGeminiKeys();
  // A bad/revoked key in the util-ai pool would otherwise cause ~1-in-N
  // random failures across every AI feature; retry with the remaining
  // keys in the pool before giving up on 401/403 (auth-only, not rate-limit).
  const attempts = Math.min(keys.length, 3);
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const key = await getGeminiKey();
    try {
      return await callGemini<T>(key, parts, options);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/Gemini error 40[13]/.test(msg)) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function callGemini<T>(
  key: string,
  parts: GeminiPart[],
  options: GenerateJsonOptions
): Promise<T> {
  const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${key}`;

  // Gemini disallows `responseMimeType: application/json` while `tools` is
  // set (the API returns 400 INVALID_ARGUMENT: "Tool use with a response
  // mime type: 'application/json' is unsupported"). Strip the JSON mime
  // when grounding is on and rely on the prompt-side JSON instructions +
  // the salvage regex below to parse the response.
  const useGrounding = !!options.useSearchGrounding;
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: options.maxTokens ?? 4096,
    // gemini-2.5-flash spends part of maxOutputTokens on invisible "thinking"
    // tokens by default, which can silently truncate the visible JSON when
    // maxTokens is tight. None of our generateJSON use cases need reasoning
    // — they're structured extraction or short scripted replies — so switch
    // it off and give the full budget to the actual answer.
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (!useGrounding) {
    generationConfig.responseMimeType = 'application/json';
    if (options.jsonSchema) generationConfig.responseSchema = options.jsonSchema;
  }
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig,
  };
  if (useGrounding) {
    // Lets Gemini fetch live URLs via Google Search. Required for the
    // booking.com URL extraction path because Booking.com blocks raw fetches.
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new Error(`Gemini output truncated by maxTokens (${generationConfig.maxOutputTokens}); raise GenerateJsonOptions.maxTokens`);
  }
  // responseMimeType=application/json guarantees parseable JSON, but we
  // still strip any accidental ```json fences just in case Gemini gets
  // creative on a model upgrade.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to salvage by grabbing the first JSON object/array we can find.
    const m = cleaned.match(/[{[][\s\S]+[}\]]/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error(`Gemini response was not JSON: ${cleaned.slice(0, 200)}`);
  }
}
