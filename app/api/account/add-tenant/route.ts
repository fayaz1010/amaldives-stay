/**
 * POST /api/account/add-tenant
 *
 * Lets an already-signed-in user create a brand-new Vayves tenant under
 * their existing email — for owners who run multiple guesthouses.
 *
 * Body: {
 *   guesthouseName: string
 *   subdomain: string
 *   makeDefault?: boolean   // if true, mark this membership as default
 * }
 *
 * Creates:
 *   - new Tenant
 *   - placeholder Property (so admin pages don't crash)
 *   - TenantMembership row (TENANT_ADMIN) linking the signed-in user
 *   - flips the user's active tenantId to the new tenant
 *
 * No new password / no new email — the existing user identity is reused.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addDomain } from '@/lib/vercel-domains';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { guesthouseName?: unknown; subdomain?: unknown; makeDefault?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const guesthouseName = typeof body.guesthouseName === 'string' ? body.guesthouseName.trim() : '';
  const rawSubdomain = typeof body.subdomain === 'string' ? body.subdomain.trim() : '';
  const makeDefault = body.makeDefault === true;

  if (!guesthouseName || !rawSubdomain) {
    return NextResponse.json(
      { error: 'guesthouseName and subdomain are required' },
      { status: 400 },
    );
  }
  const subdomain = rawSubdomain.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { error: 'Subdomain may only contain lowercase letters, numbers, and hyphens' },
      { status: 400 },
    );
  }

  // Ensure subdomain isn't taken.
  const existingTenant = await prisma.tenant.findUnique({ where: { subdomain } });
  if (existingTenant) {
    return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: guesthouseName,
          subdomain,
          plan: 'free',
          status: 'ACTIVE',
          commissionRate: 0.04,
          isVerifiedDirect: true,
        } as any,
      });

      // Placeholder Property — admin pages assume one exists.
      await tx.property.create({
        data: {
          tenantId: tenant.id,
          name: guesthouseName,
          address: '—',
          city: '—',
          state: '—',
          country: 'Maldives',
          zipCode: '—',
          phone: '—',
          email: session.user.email!,
        },
      });

      // If user wants this tenant to be the default, unset existing default.
      if (makeDefault) {
        await tx.tenantMembership.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const membership = await tx.tenantMembership.create({
        data: {
          userId: session.user.id,
          tenantId: tenant.id,
          role: 'TENANT_ADMIN',
          isDefault: makeDefault,
        },
      });

      // Flip the signed-in user's active tenant to this new one so the
      // next admin page render is for the new tenant.
      await tx.user.update({
        where: { id: session.user.id },
        data: { tenantId: tenant.id, role: 'TENANT_ADMIN' },
      });

      return { tenant, membership };
    });

    // Register the subdomain on this Vercel project so it gets a TLS cert.
    // Non-fatal: a Vercel API hiccup must not fail the tenant creation.
    try {
      await addDomain(`${result.tenant.subdomain}.vayves.com`);
    } catch (domainError) {
      console.error(
        `Failed to register Vercel domain for ${result.tenant.subdomain}.vayves.com:`,
        domainError
      );
    }

    return NextResponse.json(
      {
        success: true,
        tenantId: result.tenant.id,
        subdomain: result.tenant.subdomain,
        loginUrl: `https://${result.tenant.subdomain}.vayves.com/admin`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/account/add-tenant]', err);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
