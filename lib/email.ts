/**
 * Lazy Resend accessor.
 *
 * Construction is deferred so that environments without RESEND_API_KEY
 * (preview branches, dev clones, the build sandbox before env vars are
 * fully provisioned) can still load any module that imports from here
 * without throwing. Callers should null-check or wrap in try/catch.
 *
 * The `resend` legacy export is kept for code that previously did
 *   `await resend.emails.send(...)`. It throws ONLY at first method
 * access if the key is still missing — never at module load.
 */
import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

// Lazy proxy — preserves the `resend.emails.send(...)` call sites already
// in the codebase. Throws a descriptive error only at use-time if the key
// is still missing, never at import time.
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = getResend();
    if (!client) {
      throw new Error(
        'Resend client not available — RESEND_API_KEY is not configured',
      );
    }
    // @ts-expect-error — dynamic property access on the real client
    return client[prop];
  },
});
