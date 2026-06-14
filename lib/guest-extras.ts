import { prisma } from '@/lib/db';

/** Activity / excursion categories (original extra-services menu). */
export const ACTIVITY_EXTRA_CATEGORIES = [
  'EXCURSION',
  'DIVING',
  'SNORKELLING',
  'PICNIC',
  'FISHING',
  'RENTAL',
] as const;

/** Transfers and room add-ons shown on the guest site and booking flow. */
export const BOOKING_EXTRA_CATEGORIES = ['TRANSFER', 'ADDON'] as const;

/** All categories managed under Admin → Extra Services. */
export const GUEST_EXTRA_CATEGORIES = [
  ...BOOKING_EXTRA_CATEGORIES,
  ...ACTIVITY_EXTRA_CATEGORIES,
] as const;

export type GuestExtraCategory = (typeof GUEST_EXTRA_CATEGORIES)[number];

export type PropertyGuestPolicies = {
  airportTransferPickupNoticeHours?: number;
  airportTransferPickupNotice?: string;
  specialRequestsConfirmationEmail?: string;
  specialRequestsPolicy?: string;
};

export type GuestExtraItem = {
  id: string;
  name: string;
  category: GuestExtraCategory;
  price: number;
  description: string | null;
  /** e.g. "per night", "per hour" — parsed from description when absent. */
  unit: string | null;
};

export function parsePropertyPolicies(raw: unknown): PropertyGuestPolicies {
  if (!raw || typeof raw !== 'object') return {};
  const p = raw as Record<string, unknown>;
  return {
    airportTransferPickupNoticeHours:
      typeof p.airportTransferPickupNoticeHours === 'number'
        ? p.airportTransferPickupNoticeHours
        : undefined,
    airportTransferPickupNotice:
      typeof p.airportTransferPickupNotice === 'string' ? p.airportTransferPickupNotice : undefined,
    specialRequestsConfirmationEmail:
      typeof p.specialRequestsConfirmationEmail === 'string'
        ? p.specialRequestsConfirmationEmail
        : undefined,
    specialRequestsPolicy:
      typeof p.specialRequestsPolicy === 'string' ? p.specialRequestsPolicy : undefined,
  };
}

function inferUnit(name: string, description: string | null): string | null {
  const text = `${name} ${description ?? ''}`.toLowerCase();
  if (/per night|\/night|nightly/.test(text)) return 'per night';
  if (/per hour|\/hour|hourly/.test(text)) return 'per hour';
  if (/one.?way|round.?trip|pick.?up|drop/.test(text)) return 'per person';
  return null;
}

export function serializeGuestExtra(service: {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
}): GuestExtraItem {
  return {
    id: service.id,
    name: service.name,
    category: service.category as GuestExtraCategory,
    price: service.price,
    description: service.description,
    unit: inferUnit(service.name, service.description),
  };
}

export async function getGuestExtrasForProperty(
  tenantId: string,
  propertyId?: string | null,
  categories: readonly string[] = BOOKING_EXTRA_CATEGORIES,
): Promise<GuestExtraItem[]> {
  const services = await prisma.service.findMany({
    where: {
      tenantId,
      isActive: true,
      category: { in: [...categories] },
      OR: propertyId ? [{ propertyId: null }, { propertyId }] : [{ propertyId: null }],
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true, price: true, description: true },
  });
  return services.map(serializeGuestExtra);
}

/** Rivethi Beach — owner-provided rates and policies (Jun 2026). */
export const RIVETHI_BEACH_EXTRAS = [
  {
    name: 'Airport Transfer — Pick-up',
    category: 'TRANSFER' as const,
    price: 20,
    description: 'One-way transfer from Velana International Airport. Request at least 12 hours before check-in.',
  },
  {
    name: 'Airport Transfer — Pick up and Drop',
    category: 'TRANSFER' as const,
    price: 40,
    description: 'Round-trip airport transfer (pick-up and drop-off).',
  },
  {
    name: 'Airport Transfer — Drop',
    category: 'TRANSFER' as const,
    price: 20,
    description: 'One-way transfer from the guesthouse to Velana International Airport.',
  },
  {
    name: 'Extra Bed',
    category: 'ADDON' as const,
    price: 30,
    description: '$30 per night. Subject to availability.',
  },
  {
    name: 'Baby Cot',
    category: 'ADDON' as const,
    price: 30,
    description: '$30 per night. Subject to availability.',
  },
  {
    name: 'Late Check-out',
    category: 'ADDON' as const,
    price: 10,
    description: '$10 per hour. Subject to availability.',
  },
];

export const RIVETHI_BEACH_POLICIES: PropertyGuestPolicies = {
  airportTransferPickupNoticeHours: 12,
  airportTransferPickupNotice:
    'Airport transfer pick-up should be requested 12 hours before check-in time.',
  specialRequestsConfirmationEmail: 'reservations@rivethibeach.com',
  specialRequestsPolicy:
    'Any special requests are not guaranteed unless you receive a confirmation email from reservations@rivethibeach.com.',
};

export const RIVETHI_BEACH_CONFIG = {
  name: 'Rivethi Beach',
  subdomain: 'rivethi-beach',
  domain: 'rivethibeach.com',
  email: 'reservations@rivethibeach.com',
  website: 'https://rivethibeach.com',
};
