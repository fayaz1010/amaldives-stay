/**
 * Create (or reset) a TENANT_ADMIN login for a hotel.
 *
 * Every hotel's admins and staff live as User rows in the database, scoped to
 * their tenant via User.tenantId + a TENANT_ADMIN TenantMembership. This script
 * is the canonical way to provision a hotel's FIRST admin — after that, the
 * owner adds the rest of their team self-service from /admin/staff (which sends
 * signed invite links so staff set their own passwords).
 *
 * Usage:
 *   tsx --require dotenv/config scripts/create-tenant-admin.ts \
 *     --tenant <subdomain|tenantId> --email <email> [--name "Full Name"] [--password <pw>]
 *
 * If --password is omitted, a strong random one is generated and printed ONCE.
 * Re-running for an existing email resets that user's password + role/tenant
 * (idempotent), so it doubles as an admin password-reset tool.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function strongPassword(): string {
  // URL-safe, ~16 chars, no ambiguous prefix.
  return randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
}

async function main() {
  const tenantRef = arg('--tenant');
  const email = arg('--email')?.toLowerCase().trim();
  const name = arg('--name') ?? 'Hotel Admin';
  const password = arg('--password') ?? strongPassword();
  const generated = !arg('--password');

  if (!tenantRef || !email) {
    console.error('Required: --tenant <subdomain|tenantId> --email <email> [--name] [--password]');
    process.exit(1);
  }

  const keepClaimable = process.argv.includes('--keep-claimable');

  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: tenantRef }, { id: tenantRef }] },
    select: { id: true, name: true, subdomain: true, status: true, settings: true },
  });
  if (!tenant) {
    console.error(`Tenant not found for "${tenantRef}"`);
    process.exit(1);
  }
  if (tenant.status !== 'ACTIVE') {
    console.warn(`⚠️  Tenant ${tenant.subdomain} status is ${tenant.status} — login is blocked until it is ACTIVE.`);
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: 'TENANT_ADMIN', tenantId: tenant.id, isActive: true, name },
    create: { email, password: hash, role: 'TENANT_ADMIN', tenantId: tenant.id, isActive: true, name },
  });

  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: 'TENANT_ADMIN', isDefault: true },
    create: { userId: user.id, tenantId: tenant.id, role: 'TENANT_ADMIN', isDefault: true },
  });

  // Lock the listing: provisioning an admin on the owner's behalf IS the claim,
  // so mark it non-claimable to stop anyone else self-claiming it via /claim.
  // (Pass --keep-claimable to leave it open, e.g. if the owner will self-verify.)
  if (!keepClaimable) {
    const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: {
          ...settings,
          claimable: false,
          claimedAt: (settings.claimedAt as string) ?? new Date().toISOString(),
          claimedByEmail: email,
          claimedVia: 'platform_admin',
        } as object,
      },
    });
  }

  console.log(`✅ TENANT_ADMIN ready for ${tenant.name} (${tenant.subdomain})`);
  console.log(`   Claim:    ${keepClaimable ? 'left OPEN (--keep-claimable)' : 'locked (claimable=false)'}`);
  console.log(`   Login:    https://${tenant.subdomain}.stay.amaldives.com/auth/signin`);
  console.log(`   Email:    ${email}`);
  if (generated) {
    console.log(`   Password: ${password}   ← generated, share securely; owner should change it`);
  } else {
    console.log(`   Password: (as provided)`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
