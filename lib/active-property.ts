/**
 * Active-property context for multi-property tenants.
 *
 * A Tenant (the operator account) can own several Properties. Staff are shared
 * at the tenant level, but day-to-day operations (rooms, reservations,
 * housekeeping, finance/MIRA) are scoped to ONE active property at a time.
 *
 * The active property is stored in a per-browser cookie and ALWAYS validated
 * server-side against the caller's tenant before use — a stale or hostile
 * cookie can never leak another tenant's property. When the cookie is missing
 * or invalid we fall back to the tenant's first property, so single-property
 * tenants (the majority today) behave exactly as before with zero config.
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const ACTIVE_PROPERTY_COOKIE = 'stay_active_property';

export interface ActivePropertyLite {
  id: string;
  name: string;
}

/**
 * All properties for a tenant, oldest first (so "first property" is stable).
 */
export async function listTenantProperties(tenantId: string): Promise<ActivePropertyLite[]> {
  return prisma.property.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
}

/**
 * Resolve the active property for the given tenant.
 *
 * Order: validated cookie → tenant's first property → null (no properties yet).
 * The returned property is GUARANTEED to belong to `tenantId`.
 */
export async function getActiveProperty(tenantId: string): Promise<ActivePropertyLite | null> {
  const cookieId = cookies().get(ACTIVE_PROPERTY_COOKIE)?.value;

  if (cookieId) {
    const fromCookie = await prisma.property.findFirst({
      where: { id: cookieId, tenantId },
      select: { id: true, name: true },
    });
    if (fromCookie) return fromCookie;
  }

  // Fallback: tenant's first property (stable, oldest-first).
  return prisma.property.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
}

/**
 * Like getActiveProperty but returns just the id, for query scoping.
 * Returns null only when the tenant has no properties at all.
 */
export async function getActivePropertyId(tenantId: string): Promise<string | null> {
  const p = await getActiveProperty(tenantId);
  return p?.id ?? null;
}
