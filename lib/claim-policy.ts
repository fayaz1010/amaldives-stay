/**
 * Domain-verified claim policy — only business emails matching the
 * guesthouse website domain (or an explicit owner email on file) may claim.
 */

export type ClaimPolicy = {
  allowedDomains: string[];
  allowedEmails: string[];
};

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
  'zoho.com',
]);

const PLATFORM_DOMAINS = new Set(['stay.amaldives.com', 'amaldives.com']);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const at = normalizeEmail(email).lastIndexOf('@');
  if (at < 1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function extractWebsiteDomain(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const raw = website.trim();
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (!host.includes('.') || host === 'localhost') return null;
    if (FREE_EMAIL_DOMAINS.has(host) || PLATFORM_DOMAINS.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export function isFreeEmailDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/** Build claim policy from amaldives.com guesthouse contact fields. */
export function buildClaimPolicy(input: {
  email?: string | null;
  website?: string | null;
}): ClaimPolicy | null {
  const allowedEmails: string[] = [];
  const allowedDomains = new Set<string>();

  const siteDomain = extractWebsiteDomain(input.website);
  if (siteDomain) allowedDomains.add(siteDomain);

  const rawEmail = input.email?.trim();
  if (rawEmail && rawEmail.includes('@')) {
    const normalized = normalizeEmail(rawEmail);
    const domain = emailDomain(normalized);
    if (domain) {
      if (isFreeEmailDomain(domain) || PLATFORM_DOMAINS.has(domain)) {
        // No domain proof — allow only this exact address from our records.
        allowedEmails.push(normalized);
      } else {
        allowedDomains.add(domain);
        allowedEmails.push(normalized);
      }
    }
  }

  if (allowedDomains.size === 0 && allowedEmails.length === 0) {
    return null;
  }

  return {
    allowedDomains: [...allowedDomains],
    allowedEmails,
  };
}

export function emailMatchesClaimPolicy(email: string, policy: ClaimPolicy): boolean {
  const normalized = normalizeEmail(email);
  if (policy.allowedEmails.includes(normalized)) return true;

  const domain = emailDomain(normalized);
  if (!domain) return false;
  if (isFreeEmailDomain(domain)) return false;
  if (PLATFORM_DOMAINS.has(domain)) return false;

  for (const allowed of policy.allowedDomains) {
    const a = allowed.toLowerCase();
    if (domain === a || domain.endsWith(`.${a}`)) return true;
  }
  return false;
}

export function claimPolicyHint(policy: ClaimPolicy): string {
  if (policy.allowedDomains.length > 0) {
    const primary = policy.allowedDomains[0];
    return `Use your business email @${primary}`;
  }
  if (policy.allowedEmails.length > 0) {
    const masked = policy.allowedEmails[0].replace(/^(.{2}).*(@.*)$/, '$1***$2');
    return `Use the owner email on file (${masked})`;
  }
  return 'Use your registered business email';
}

export function readClaimPolicy(settings: unknown): ClaimPolicy | null {
  if (!settings || typeof settings !== 'object') return null;
  const s = settings as Record<string, unknown>;
  const raw = s.claimPolicy;
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const allowedDomains = Array.isArray(p.allowedDomains)
    ? p.allowedDomains.filter((d): d is string => typeof d === 'string')
    : [];
  const allowedEmails = Array.isArray(p.allowedEmails)
    ? p.allowedEmails.filter((e): e is string => typeof e === 'string').map(normalizeEmail)
    : [];
  if (allowedDomains.length === 0 && allowedEmails.length === 0) return null;
  return { allowedDomains, allowedEmails };
}
