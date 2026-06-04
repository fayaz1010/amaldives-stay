/**
 * Brand email (you@theirguesthouse.com) DNS helper.
 *
 * We provision mailboxes on an established provider (Zoho Mail — the value pick
 * for guesthouses, ~$1/mailbox/mo — or Google Workspace) rather than self-host,
 * so deliverability (SPF/DKIM/DMARC) is handled. The owner adds these records at
 * their registrar alongside the website domain records.
 *
 * NOTE: the actual mailbox is created by the operator (admin) in the provider's
 * console; the DKIM TXT value is generated there per-domain and pasted back in.
 */

export type EmailProvider = 'zoho' | 'google';

export interface EmailDnsRecord {
  type: 'MX' | 'TXT';
  name: string; // host: "@", "_dmarc", "zoho._domainkey", etc.
  value: string;
  priority?: number; // MX only
  note?: string;
}

export const EMAIL_PROVIDER_LABEL: Record<EmailProvider, string> = {
  zoho: 'Zoho Mail',
  google: 'Google Workspace',
};

export function emailDnsRecords(provider: EmailProvider, domain: string): EmailDnsRecord[] {
  const dmarc: EmailDnsRecord = {
    type: 'TXT',
    name: '_dmarc',
    value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${domain}`,
  };

  if (provider === 'google') {
    return [
      { type: 'MX', name: '@', value: 'smtp.google.com', priority: 1 },
      { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.google.com ~all' },
      {
        type: 'TXT',
        name: 'google._domainkey',
        value: '(paste the DKIM value from Google Admin → Apps → Gmail → Authenticate email)',
        note: 'Generated in your Google Workspace admin console.',
      },
      dmarc,
    ];
  }

  // Zoho (default)
  return [
    { type: 'MX', name: '@', value: 'mx.zoho.com', priority: 10 },
    { type: 'MX', name: '@', value: 'mx2.zoho.com', priority: 20 },
    { type: 'MX', name: '@', value: 'mx3.zoho.com', priority: 50 },
    { type: 'TXT', name: '@', value: 'v=spf1 include:zoho.com ~all' },
    {
      type: 'TXT',
      name: 'zoho._domainkey',
      value: '(paste the DKIM value Zoho shows after you add the domain)',
      note: 'Generated in Zoho Mail Admin → Domains → DKIM.',
    },
    dmarc,
  ];
}
