import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        subdomain: true,
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

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        description: tenant.description,
        logo: tenant.logo,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        isVerifiedDirect: tenant.isVerifiedDirect,
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
          }
        : null,
    });
  } catch (error) {
    console.error('Public info API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
