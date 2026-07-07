// Single source of truth for the PMS domain + brand.
//
// Production root domain is Vayves (vayves.com). Set NEXT_PUBLIC_ROOT_DOMAIN in
// env to override (e.g. a preview/staging root). The legacy stay.amaldives.com
// domain is kept ONLY for 301 redirects during the migration — see middleware.ts.

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'vayves.com';

/** Legacy PMS root, redirected to ROOT_DOMAIN. Do not build new links off this. */
export const LEGACY_ROOT_DOMAIN = 'stay.amaldives.com';

/** Product brand name shown to users (emails, titles, portal, footers). */
export const BRAND = 'Vayves';

/** Absolute base URL for the platform root (marketing / login / claim). */
export const PMS_BASE = `https://${ROOT_DOMAIN}`;

/** Absolute base URL for a tenant's public booking site: {subdomain}.{root}. */
export function tenantUrl(subdomain: string, path = ''): string {
  const p = path && !path.startsWith('/') ? `/${path}` : path;
  return `https://${subdomain}.${ROOT_DOMAIN}${p}`;
}

/** Host header (no scheme) for a tenant subdomain — used for Vercel domain adds. */
export function tenantHost(subdomain: string): string {
  return `${subdomain}.${ROOT_DOMAIN}`;
}
