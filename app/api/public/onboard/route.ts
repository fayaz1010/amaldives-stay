import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { addDomain } from '@/lib/vercel-domains';

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
    const resolvedAmaldivesSlug =
      amaldivesSlug ||
      (normalizedSubdomain.length >= 3 ? normalizedSubdomain : undefined);

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
          amaldivesSlug: resolvedAmaldivesSlug,
        } as any,
      });

      // Every tenant needs at least one Property — admin pages assume one
      // exists (PATCH /api/admin/settings silently drops city/phone/etc.
      // when there is no Property to update, and POST /api/admin/rooms
      // requires a non-nullable propertyId). The onboarding wizard will
      // overwrite the placeholder fields below in step 2.
      await tx.property.create({
        data: {
          tenantId: newTenant.id,
          name: resolvedName,
          address: '—',
          city: '—',
          state: '—',
          country: 'Maldives',
          zipCode: '—',
          phone: '—',
          email,
        },
      });

      const owner = await tx.user.create({
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

      // CRITICAL: create the TenantMembership too. Without it, the JWT callback
      // (which validates token.tenantId against the user's memberships and falls
      // back to undefined when none exist) wipes the active tenant on first
      // sign-in — locking the brand-new owner out of /admin (/unauthorized).
      await tx.tenantMembership.create({
        data: { userId: owner.id, tenantId: newTenant.id, role: 'TENANT_ADMIN', isDefault: true },
      });

      return newTenant;
    });

    // Register the new subdomain on this Vercel project so it gets a TLS cert.
    // DNS already wildcard-CNAMEs *.stay.amaldives.com → cname.vercel-dns.com,
    // so verification is instant and the cert provisions in ~30-60s. Without
    // this the freshly minted loginUrl below fails TLS until added by hand.
    // Non-fatal: a Vercel API hiccup must not fail an otherwise-complete signup.
    try {
      await addDomain(`${tenant.subdomain}.stay.amaldives.com`);
    } catch (domainError) {
      console.error(
        `Failed to register Vercel domain for ${tenant.subdomain}.stay.amaldives.com:`,
        domainError
      );
    }

    return NextResponse.json(
      {
        success: true,
        tenantId: tenant.id,
        subdomain: tenant.subdomain,
        loginUrl: `https://${tenant.subdomain}.stay.amaldives.com/auth/signin`,
        amaldivesUrl: resolvedAmaldivesSlug
          ? `https://www.amaldives.com/guesthouses/${resolvedAmaldivesSlug}`
          : null,
        stayUrl: `https://${tenant.subdomain}.stay.amaldives.com`,
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
