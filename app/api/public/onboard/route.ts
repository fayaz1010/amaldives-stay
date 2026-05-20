import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      guestHouseName,
      guesthouseName,   // claim form field name
      subdomain,
      email,
      ownerName,
      name,             // fallback from claim form
      password,
      amaldivesSlug,
    } = body;

    const resolvedName = guestHouseName || guesthouseName;
    const resolvedOwnerName = ownerName || name || email.split('@')[0];

    if (!resolvedName || !subdomain || !email || !password) {
      return NextResponse.json(
        {
          error: 'Missing required fields: guestHouseName, subdomain, email, password',
        },
        { status: 400 }
      );
    }

    const normalizedSubdomain = String(subdomain).toLowerCase().trim();

    if (!/^[a-z0-9-]+$/.test(normalizedSubdomain)) {
      return NextResponse.json(
        { error: 'Subdomain may only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: normalizedSubdomain },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: resolvedName,
          subdomain: normalizedSubdomain,
          plan: 'free',
          status: 'ACTIVE',
          commissionRate: 0.04,
          isVerifiedDirect: true,
          amaldivesSlug,
        } as any,
      });

      await tx.user.create({
        data: {
          email,
          name: resolvedOwnerName,
          password: hashedPassword,
          role: 'TENANT_ADMIN',
          tenantId: newTenant.id,
          staffProfile: {
            create: {
              tenantId: newTenant.id,
              position: 'Owner',
              // StaffProfile requires these — Prisma was rejecting the
              // create() with `Argument department is missing` and the
              // entire claim flow returned 500. Defaults match what a
              // self-signed-up owner would represent.
              department: 'Management',
              hireDate: new Date(),
            },
          },
        } as any,
      });

      return newTenant;
    });

    return NextResponse.json(
      {
        success: true,
        tenantId: tenant.id,
        subdomain: tenant.subdomain,
        loginUrl: `https://${tenant.subdomain}.stay.amaldives.com/auth/signin`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Public onboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
