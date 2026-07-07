export type PaymentProvider = 'stripe' | 'bml_connect' | 'maya' | 'pay_at_property';

export interface DepositConfig {
  enabled?: boolean;
  percent?: number;
  minAmount?: number;
}

export interface TenantPaymentsConfig {
  enabledProviders: PaymentProvider[];
  currency: 'USD' | 'MVR';
  stripeConnectAccountId?: string;
  bmlConnect?: {
    merchantId?: string;
    webhookSecret?: string;
  };
  maya?: {
    merchantId?: string;
    apiKey?: string;
    webhookSecret?: string;
    /** Maya Business portal subdomain slug for this property */
    portalSlug?: string;
  };
  defaultProvider?: PaymentProvider;
}

export interface TenantSettings {
  draftMode?: boolean;
  payments?: TenantPaymentsConfig;
  deposit?: DepositConfig;
  icalSyncIntervalMinutes?: number;
  embed?: {
    buttonLabel?: string;
    primaryColor?: string;
  };
}

export function getTenantSettings(raw: unknown): TenantSettings {
  if (!raw || typeof raw !== 'object') return {};
  return raw as TenantSettings;
}

export function getPaymentsConfig(raw: unknown): TenantPaymentsConfig {
  const settings = getTenantSettings(raw);
  return (
    settings.payments ?? {
      enabledProviders: ['stripe', 'pay_at_property'],
      currency: 'USD',
      defaultProvider: 'stripe',
    }
  );
}

export function getDepositConfig(raw: unknown): DepositConfig {
  const settings = getTenantSettings(raw);
  return settings.deposit ?? { enabled: false, percent: 0 };
}

export function amaldivesListingUrl(slug: string): string {
  return `https://www.amaldives.com/guesthouses/${slug}`;
}

export function staySubdomainUrl(subdomain: string, path = ''): string {
  const base = `https://${subdomain}.vayves.com`;
  return path ? `${base}${path.startsWith('/') ? path : `/${path}`}` : base;
}
