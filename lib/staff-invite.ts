/**
 * Tiny signed-token helper for staff invites.
 *
 * Avoids adding a DB table: the entire invite payload is encoded in a
 * URL-safe base64 string with an HMAC signature derived from
 * NEXTAUTH_SECRET. If the secret rotates, all outstanding invites are
 * invalidated — which is fine for invites that already expire in 7 days.
 */
import crypto from 'crypto';

interface InvitePayload {
  userId: string;
  email: string;
  /** Epoch ms. */
  expiresAt: number;
}

function secret(): Buffer {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET not configured');
  return Buffer.from(s);
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

export function generateInviteToken(payload: InvitePayload): string {
  const body = Buffer.from(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest();
  return `${base64url(body)}.${base64url(sig)}`;
}

export function verifyInviteToken(token: string):
  | { ok: true; payload: InvitePayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' } {
  const [b, s] = token.split('.');
  if (!b || !s) return { ok: false, reason: 'malformed' };

  let bodyBuf: Buffer;
  let sigBuf: Buffer;
  try {
    bodyBuf = fromBase64url(b);
    sigBuf = fromBase64url(s);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const expected = crypto.createHmac('sha256', secret()).update(bodyBuf).digest();
  // crypto.timingSafeEqual requires equal-length buffers.
  if (expected.length !== sigBuf.length || !crypto.timingSafeEqual(expected, sigBuf)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: InvitePayload;
  try {
    payload = JSON.parse(bodyBuf.toString('utf8')) as InvitePayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}
