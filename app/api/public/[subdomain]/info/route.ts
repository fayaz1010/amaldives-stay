import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaymentsConfig } from '@/lib/tenant-settings';
import { isStripeConfigured } from '@/lib/stripe';
import {
  BOOKING_EXTRA_CATEGORIES,
  getGuestExtrasForProperty,
  parsePropertyPolicies,
} from '@/lib/guest-extras';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ subdomain }, { amaldivesSlug: subdomain }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        subdomain: true,
        amaldivesSlug: true,
        settings: true,
        plan: true,
        isVerifiedDirect: true,
        properties: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            country: true,
            phone: true,
            email: true,
            website: true,
            images: true,
            amenities: true,
            settings: true,
            checkInTime: true,
            checkOutTime: true,
            policies: true,
            rooms: {
              where: { status: { in: ['AVAILABLE', 'OCCUPIED'] } },
              select: {
                id: true,
                type: true,
                capacity: true,
                basePrice: true,
                description: true,
                amenities: true,
                images: true,
              },
              distinct: ['type'],
            },
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Guesthouse not found' }, { status: 404 });
    }

    const property = tenant.properties[0] ?? null;
    const webProfile = (property?.settings as any)?.webProfile ?? {};
    const policies = parsePropertyPolicies(property?.policies);
    const extras = property
      ? await getGuestExtrasForProperty(tenant.id, property.id, BOOKING_EXTRA_CATEGORIES)
      : [];
    const payments = getPaymentsConfig(tenant.settings);
    const stripeOk = isStripeConfigured();
    const enabledPayments = payments.enabledProviders.filter((p) => {
      if (p === 'stripe') return stripeOk;
      if (p === 'maya') return Boolean(payments.maya?.merchantId);
      if (p === 'bml_connect') return false;
      return true;
    });

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        description: tenant.description,
        logo: tenant.logo,
        subdomain: tenant.subdomain,
        amaldivesSlug: tenant.amaldivesSlug,
        plan: tenant.plan,
        isVerifiedDirect: tenant.isVerifiedDirect,
        bookUrl: `https://${tenant.subdomain}.stay.amaldives.com/book`,
        payments: {
          currency: payments.currency,
          enabledProviders: enabledPayments,
          defaultProvider: payments.defaultProvider,
        },
      },
      property: property
        ? {
            name: property.name,
            description: property.description,
            address: property.address,
            city: property.city,
            country: property.country,
            phone: property.phone,
            email: property.email,
            website: property.website,
            images: property.images,
            amenities: property.amenities,
            checkInTime: property.checkInTime,
            checkOutTime: property.checkOutTime,
            tagline: webProfile.tagline ?? null,
            highlights: webProfile.highlights ?? [],
            roomTypes: property.rooms ?? [],
            policies,
          }
        : null,
      extras,
    });
  } catch (error) {
    console.error('Public info API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
