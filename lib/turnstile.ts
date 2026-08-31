/**
 * Cloudflare Turnstile verification for public forms.
 *
 * The signup and claim-assist forms were taking ~20 automated submissions a day
 * (peaking at 90 on 29 Aug), each one creating an account, mailing a
 * confirmation to a scraped address, and pushing a junk lead to Oz Systems HQ.
 * The existing per-IP rate limits and randomness heuristics do not catch them:
 * the traffic is spread across IPs and the fake names contain spaces.
 *
 * Skipped entirely when TURNSTILE_SECRET_KEY is unset, so local dev and preview
 * deploys keep working without the key. When Cloudflare itself is unreachable
 * the check allows the request through, matching the fail-open convention in
 * lib/rate-limit.ts — an outage at Cloudflare must not close signups.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Validate a Turnstile token from a form submission.
 *
 * @param token The `cf-turnstile-response` value posted by the client.
 * @param ip    Client IP, passed to Cloudflare to strengthen the assessment.
 */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };

  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, reason: 'missing-token' };
  }

  const form = new URLSearchParams({ secret, response: token });
  if (ip && ip !== 'unknown') form.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, reason: (data['error-codes'] ?? ['rejected']).join(',') };
  } catch (err) {
    console.error('[turnstile] unreachable, allowing request:', err instanceof Error ? err.message : err);
    return { ok: true };
  }
}

/** 403 response for a failed challenge. Deliberately vague to the caller. */
export function challengeFailed() {
  return Response.json(
    { message: 'Could not verify you are human. Please reload the page and try again.' },
    { status: 403 },
  );
}
