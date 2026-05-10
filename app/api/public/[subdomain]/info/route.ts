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
        isVerifiedDirect: true,
        properties: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            country: true,
            images: true,
            amenities: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Guesthouse not found' }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        description: tenant.description,
        logo: tenant.logo,
        subdomain: tenant.subdomain,
        isVerifiedDirect: tenant.isVerifiedDirect,
        properties: tenant.properties,
      },
    });
  } catch (error) {
    console.error('Public info API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
