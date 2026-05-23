/**
 * One-shot: verify TenantMembership backfill.
 *   npx tsx --require dotenv/config scripts/verify-memberships.ts
 *     dotenv_config_path=.env.local
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const [usersWithTenant, memberships, defaults] = await Promise.all([
      prisma.user.count({ where: { tenantId: { not: null } } }),
      prisma.tenantMembership.count(),
      prisma.tenantMembership.count({ where: { isDefault: true } }),
    ]);
    console.log('Users with tenantId:        ', usersWithTenant);
    console.log('TenantMembership rows:      ', memberships);
    console.log('Default memberships:        ', defaults);
    if (memberships < usersWithTenant) {
      console.warn(`⚠️  ${usersWithTenant - memberships} users still missing a membership row`);
    } else {
      console.log('✓ Every active-tenant user has a membership.');
    }
    const sample = await prisma.tenantMembership.findMany({
      take: 3,
      include: {
        user: { select: { email: true } },
        tenant: { select: { subdomain: true, name: true } },
      },
    });
    console.log('\nSample rows:');
    for (const row of sample) {
      console.log(`  ${row.user.email}  →  ${row.tenant.subdomain} (${row.role}${row.isDefault ? ', default' : ''})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
