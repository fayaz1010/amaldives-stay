/**
 * POST /api/public/claim/complete
 *
 * Claim a PRE-PROVISIONED tenant — one we set up in advance (properties,
 * sharing, tax config already in place) and flagged `settings.claimable = true`.
 * The owner just creates their login; everything is already there. They then
 * update rooms / photos / rates themselves.
 *
 * Body: { subdomain, email, password, ownerName? }
 * Distinct from /api/public/onboard, which creates a brand-new tenant.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { subdomain?: string; email?: string; password?: string; ownerName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const subdomain = String(body.subdomain || '').toLowerCase().trim();
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const ownerName = body.ownerName?.trim() || email.split('@')[0];

  if (!subdomain || !email || !password) {
    return NextResponse.json({ error: 'subdomain, email and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Must be an existing, claimable tenant.
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain }, { amaldivesSlug: subdomain }] },
    select: { id: true, subdomain: true, name: true, settings: true, status: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'No pre-provisioned property found for this name' }, { status: 404 });
  }
  const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
  if (settings.claimable !== true) {
    return NextResponse.json(
      { error: 'This property is already claimed. Please sign in instead.' },
      { status: 409 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: ownerName,
        password: hashedPassword,
        role: 'TENANT_ADMIN',
        tenantId: tenant.id,
        staffProfile: {
          create: { tenantId: tenant.id, department: 'Management', position: 'Owner', hireDate: new Date(), permissions: [] },
        },
      },
    });
    await tx.tenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: 'TENANT_ADMIN', isDefault: true },
      create: { userId: user.id, tenantId: tenant.id, role: 'TENANT_ADMIN', isDefault: true },
    });
    // Mark claimed so it can't be claimed twice.
    await tx.tenant.update({
      where: { id: tenant.id },
      data: { settings: { ...settings, claimable: false, claimedAt: new Date().toISOString() } as any },
    });
  });

  return NextResponse.json({
    success: true,
    subdomain: tenant.subdomain,
    stayUrl: `https://${tenant.subdomain}.stay.amaldives.com`,
    loginUrl: `https://${tenant.subdomain}.stay.amaldives.com/auth/signin`,
  });
}
