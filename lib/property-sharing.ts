/**
 * Flexible per-property resource sharing.
 *
 * A multi-property operator decides, per resource CATEGORY, whether it is
 * shared across all their properties (one pool) or scoped to each property
 * separately. Hotels on different islands typically share little; a single
 * compound might share everything. So this is configurable, not hardcoded.
 *
 * Config lives in Tenant.settings.sharing as { [category]: boolean }.
 * DEFAULT = shared (true) for every category — this preserves the historical
 * single-pool behaviour, so nothing changes until an owner opts a category
 * into per-property mode.
 *
 * "Shared"  → query by tenant only; new rows get propertyId = null (the pool).
 * "Per-property" → query by tenant + active property; new rows get the active
 *                  property's id.
 */
import { prisma } from '@/lib/db';

export const SHARE_CATEGORIES = [
  'staff',      // staff directory (profiles)
  'services',   // room-service / extra-services menu (Service)
  'fnb',        // F&B outlets + menus (FnBOutlet)
  'minibar',    // minibar catalogue (MinIBarItem)
  'inventory',  // supplies, logistics stock + assets
  'ratePlans',  // rate plans
  'promotions', // discount codes
  'transport',  // transfer / transport options
] as const;

export type ShareCategory = (typeof SHARE_CATEGORIES)[number];

export const SHARE_LABELS: Record<ShareCategory, string> = {
  staff: 'Staff',
  services: 'Services menu',
  fnb: 'F&B outlets & menus',
  minibar: 'Minibar catalogue',
  inventory: 'Inventory & assets',
  ratePlans: 'Rate plans',
  promotions: 'Promotions',
  transport: 'Transfers / transport',
};

export type SharingConfig = Record<ShareCategory, boolean>;

/** Default: everything shared (backward-compatible single pool). */
export function defaultSharing(): SharingConfig {
  return SHARE_CATEGORIES.reduce((acc, c) => {
    acc[c] = true;
    return acc;
  }, {} as SharingConfig);
}

/** Merge stored config (Tenant.settings.sharing) over the defaults. */
export function readSharing(settings: unknown): SharingConfig {
  const base = defaultSharing();
  const raw = (settings as any)?.sharing;
  if (raw && typeof raw === 'object') {
    for (const c of SHARE_CATEGORIES) {
      if (typeof raw[c] === 'boolean') base[c] = raw[c];
    }
  }
  return base;
}

/** Fetch the resolved sharing config for a tenant. */
export async function getSharing(tenantId: string): Promise<SharingConfig> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
  return readSharing(t?.settings);
}

/**
 * where-fragment for listing a category's rows. Returns `{}` when the category
 * is shared (tenant-wide), or `{ propertyId }` when scoped. Pass the resolved
 * sharing config + active property id (both cheap to fetch once per request).
 */
export function categoryWhere(
  category: ShareCategory,
  sharing: SharingConfig,
  activePropertyId: string | null,
): { propertyId?: string } {
  if (sharing[category]) return {}; // shared pool
  return activePropertyId ? { propertyId: activePropertyId } : {};
}

/** propertyId to stamp on a NEW row of this category. */
export function categoryCreatePropertyId(
  category: ShareCategory,
  sharing: SharingConfig,
  activePropertyId: string | null,
): string | null {
  return sharing[category] ? null : activePropertyId;
}
