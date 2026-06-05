
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addDomain } from '@/lib/vercel-domains';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        properties: true,
        _count: {
          select: {
            users: true,
            properties: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Tenants API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        description: data.description,
        plan: data.plan || 'basic',
        status: 'ACTIVE',
        theme: data.theme || {
          primaryColor: '#14B8A6',
          secondaryColor: '#0F766E',
          fontFamily: 'Inter',
          borderRadius: '8px',
        },
        settings: data.settings || {
          currency: 'USD',
          timezone: 'UTC',
          language: 'en',
        },
      },
      include: {
        _count: {
          select: {
            users: true,
            properties: true,
            bookings: true,
          },
        },
      },
    });

    // Register the subdomain on this Vercel project so it gets a TLS cert.
    // Non-fatal: a Vercel API hiccup must not fail the tenant creation.
    try {
      await addDomain(`${tenant.subdomain}.stay.amaldives.com`);
    } catch (domainError) {
      console.error(
        `Failed to register Vercel domain for ${tenant.subdomain}.stay.amaldives.com:`,
        domainError
      );
    }

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('Create tenant API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
