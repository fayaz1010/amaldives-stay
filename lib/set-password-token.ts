import { randomBytes, createHash } from 'crypto';

export const SET_PASSWORD_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a secure random token for set-password links.
 * Returns both the raw token (to send in the URL) and the hashed version (to store in DB).
 */
export function generateSetPasswordToken(): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  // 32 bytes = 256 bits of entropy, URL-safe base64
  const token = randomBytes(32).toString('base64url');
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + SET_PASSWORD_TOKEN_TTL_MS);

  return { token, hashedToken, expiresAt };
}

/**
 * Hash a token using SHA-256 for storage in the database.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify that a token matches the stored hash and hasn't expired.
 */
export function isValidToken(
  token: string,
  storedHash: string,
  expiresAt: Date
): boolean {
  if (Date.now() > expiresAt.getTime()) {
    return false;
  }

  const computedHash = hashToken(token);
  
  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== storedHash.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < computedHash.length; i++) {
    mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }

  return mismatch === 0;
}
