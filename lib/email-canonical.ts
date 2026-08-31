/**
 * Canonical form of an email address, for duplicate detection.
 *
 * Gmail ignores dots and anything after a `+` in the local part, so
 * `d.ave81.30.5.m.i.a@gmail.com` and `dave81305mia@gmail.com` are one inbox.
 * The signup abuse leaned on exactly that — 336 submissions used 316 distinct
 * addresses but only 311 distinct inboxes.
 *
 * Only Gmail-family domains are collapsed. Elsewhere dots and `+` tags can
 * address genuinely different mailboxes, so rewriting them would merge
 * unrelated accounts.
 */

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export function canonicalEmail(raw: string): string {
  const email = String(raw ?? '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return email;

  const stripped = local.split('+')[0]!.replace(/\./g, '');
  // An address that is only dots and tags has no canonical form worth storing.
  if (stripped === '') return email;

  return `${stripped}@gmail.com`;
}

/** True when two addresses reach the same inbox. */
export function sameInbox(a: string, b: string): boolean {
  return canonicalEmail(a) === canonicalEmail(b);
}
