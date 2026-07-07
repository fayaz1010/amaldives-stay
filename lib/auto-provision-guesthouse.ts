import { prisma } from '@/lib/db';
import { addDomain } from '@/lib/vercel-domains';
import {
  buildClaimPolicy,
  readClaimPolicy,
  type ClaimPolicy,
} from '@/lib/claim-policy';
import {
  fetchAmaldivesGuesthouse,
  type AmaldivesGuesthouseRow,
} from '@/lib/amaldives-guesthouse';

export type ProvisionResult =
  | { ok: true; tenantId: string; subdomain: string; created: boolean; claimPolicy: ClaimPolicy }
  | { ok: false; reason: 'not_found' | 'no_verification_data' | 'already_claimed' | 'inactive' };

function slugToSubdomain(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48);
}

function tenantSettingsFromGh(gh: AmaldivesGuesthouseRow, claimPolicy: ClaimPolicy) {
  return {
    claimable: true,
    autoProvisioned: true,
    autoProvisionedAt: new Date().toISOString(),
    claimPolicy,
    currency: 'USD',
    timezone: 'Indian/Maldives',
  };
}

async function createProvisionedTenant(
  gh: AmaldivesGuesthouseRow,
  claimPolicy: ClaimPolicy
): Promise<{ tenantId: string; subdomain: string }> {
  const subdomain = slugToSubdomain(gh.slug);
  if (subdomain.length < 3) {
    throw new Error('Invalid subdomain from slug');
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name: gh.name,
        subdomain,
        description: `${gh.name} — local island guesthouse in the Maldives.`,
        plan: 'free',
        status: 'ACTIVE',
        commissionRate: 0.04,
        isVerifiedDirect: true,
        amaldivesSlug: gh.slug,
        settings: tenantSettingsFromGh(gh, claimPolicy) as any,
      } as any,
    });

    await tx.property.create({
      data: {
        tenantId: newTenant.id,
        name: gh.name,
        address: gh.island || '—',
        city: gh.island || '—',
        state: gh.atoll || '—',
        country: 'Maldives',
        zipCode: '—',
        phone: gh.phone || '—',
        email: gh.email || `contact@${subdomain}.vayves.com`,
        currency: 'USD',
        timezone: 'Indian/Maldives',
      },
    });

    return newTenant;
  });

  try {
    await addDomain(`${tenant.subdomain}.vayves.com`);
  } catch (domainError) {
    console.error(`[auto-provision] Vercel domain registration failed for ${tenant.subdomain}`, domainError);
  }

  return { tenantId: tenant.id, subdomain: tenant.subdomain };
}

/**
 * Ensure a claimable tenant exists for an amaldives.com guesthouse slug.
 * Idempotent — skips if already provisioned and claimed.
 */
export async function ensureGuesthouseProvisioned(slug: string): Promise<ProvisionResult> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return { ok: false, reason: 'not_found' };

  const existing = await prisma.tenant.findFirst({
    where: { OR: [{ amaldivesSlug: normalizedSlug }, { subdomain: slugToSubdomain(normalizedSlug) }] },
    select: { id: true, subdomain: true, settings: true },
  });

  if (existing) {
    const settings = (existing.settings as Record<string, unknown> | null) ?? {};
    if (settings.claimable === false) {
      return { ok: false, reason: 'already_claimed' };
    }
    let claimPolicy = readClaimPolicy(settings);
    if (!claimPolicy) {
      const gh = await fetchAmaldivesGuesthouse(normalizedSlug);
      claimPolicy = gh ? buildClaimPolicy({ email: gh.email, website: gh.website }) : null;
      if (claimPolicy) {
        await prisma.tenant.update({
          where: { id: existing.id },
          data: {
            settings: { ...settings, claimable: true, claimPolicy } as any,
          },
        });
      }
    }
    if (!claimPolicy) {
      return { ok: false, reason: 'no_verification_data' };
    }
    return {
      ok: true,
      tenantId: existing.id,
      subdomain: existing.subdomain,
      created: false,
      claimPolicy,
    };
  }

  const gh = await fetchAmaldivesGuesthouse(normalizedSlug);
  if (!gh) return { ok: false, reason: 'not_found' };
  if (gh.adminStatus && gh.adminStatus !== 'active') {
    return { ok: false, reason: 'inactive' };
  }

  const claimPolicy = buildClaimPolicy({ email: gh.email, website: gh.website });
  if (!claimPolicy) {
    return { ok: false, reason: 'no_verification_data' };
  }

  const { tenantId, subdomain } = await createProvisionedTenant(gh, claimPolicy);
  return { ok: true, tenantId, subdomain, created: true, claimPolicy };
}

/** Cron batch — provision all guesthouses that have verifiable contact data. */
export async function provisionAllGuesthouses(limit = 200) {
  const { listProvisionableGuesthouses } = await import('@/lib/amaldives-guesthouse');
  const rows = await listProvisionableGuesthouses(limit);
  const results: Array<{ slug: string; status: string; subdomain?: string }> = [];

  for (const gh of rows) {
    try {
      const outcome = await ensureGuesthouseProvisioned(gh.slug);
      if (outcome.ok) {
        results.push({
          slug: gh.slug,
          status: outcome.created ? 'created' : 'exists',
          subdomain: outcome.subdomain,
        });
      } else {
        results.push({ slug: gh.slug, status: outcome.reason });
      }
    } catch (err) {
      console.error('[auto-provision] failed for', gh.slug, err);
      results.push({ slug: gh.slug, status: 'error' });
    }
  }

  return results;
}
