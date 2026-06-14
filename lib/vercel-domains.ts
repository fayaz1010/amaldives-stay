/**
 * Vercel Domains API helper — attach a guesthouse's own domain to this single
 * Vercel project (multi-tenant "Vercel for Platforms" pattern). We never create
 * a Vercel project/account per guesthouse — every customer domain is added to
 * THIS project and routed to the right tenant by middleware/host lookup.
 *
 * Required env:
 *   VERCEL_API_TOKEN   — a token with access to the project's team
 *   VERCEL_PROJECT_ID  — this app's Vercel project id
 *   VERCEL_TEAM_ID     — the team/owner id (optional for personal accounts)
 */

const API = 'https://api.vercel.com';

function cfg() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID || '';
  if (!token || !projectId) {
    throw new Error('VERCEL_API_TOKEN and VERCEL_PROJECT_ID must be set to manage custom domains');
  }
  const q = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  return { token, projectId, q };
}

async function vfetch(path: string, init?: RequestInit) {
  const { token } = cfg();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } })?.error?.message || res.statusText;
    throw new Error(`Vercel API ${res.status}: ${msg}`);
  }
  return body as Record<string, unknown>;
}

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string; // host part, e.g. "@" or "www"
  value: string;
}

export interface DomainStatus {
  domain: string;
  verified: boolean;
  /** DNS records the owner must set at their registrar. */
  records: DnsRecord[];
  misconfigured: boolean;
}

const isApex = (domain: string) => domain.split('.').filter(Boolean).length === 2;

/** Vercel apex A record (updated IP range — replaces legacy 76.76.21.21). */
export const VERCEL_APEX_IP = '216.198.79.1';

/** Default records Vercel expects (apex → A, sub → CNAME). */
function expectedRecords(domain: string): DnsRecord[] {
  if (isApex(domain)) return [{ type: 'A', name: '@', value: VERCEL_APEX_IP }];
  const host = domain.split('.')[0];
  return [{ type: 'CNAME', name: host, value: 'cname.vercel-dns.com' }];
}

/** Add a customer domain to this project. Idempotent-ish: 409 = already added. */
export async function addDomain(domain: string): Promise<DomainStatus> {
  const { projectId, q } = cfg();
  try {
    await vfetch(`/v10/projects/${projectId}/domains${q}`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });
  } catch (e) {
    // 409 "domain already exists" is fine — fall through to status.
    if (!(e instanceof Error) || !/already|409/i.test(e.message)) throw e;
  }
  return getDomainStatus(domain);
}

export async function getDomainStatus(domain: string): Promise<DomainStatus> {
  const { projectId, q } = cfg();
  // Project-domain record (gives verified flag + any required verification TXT).
  const pd = await vfetch(`/v9/projects/${projectId}/domains/${domain}${q}`).catch(() => null);
  // Domain config (gives misconfigured flag).
  const conf = (await vfetch(`/v6/domains/${domain}/config${q}`).catch(() => null)) as
    | { misconfigured?: boolean }
    | null;

  const verification = (pd?.verification as Array<{ type: string; domain: string; value: string }>) || [];
  const verified = Boolean(pd?.verified);
  const records: DnsRecord[] = verified ? [] : expectedRecords(domain);
  for (const v of verification) {
    if (v.type?.toUpperCase() === 'TXT') {
      records.push({ type: 'TXT', name: v.domain, value: v.value });
    }
  }
  return {
    domain,
    verified,
    records,
    misconfigured: Boolean(conf?.misconfigured),
  };
}

export async function removeDomain(domain: string): Promise<void> {
  const { projectId, q } = cfg();
  await vfetch(`/v9/projects/${projectId}/domains/${domain}${q}`, { method: 'DELETE' }).catch(
    () => undefined,
  );
}
