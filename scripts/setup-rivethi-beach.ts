/**
 * Configure Rivethi Beach with owner-requested transfer/add-on pricing,
 * policies, and rivethibeach.com custom domain.
 *
 * Usage:
 *   tsx --require dotenv/config scripts/setup-rivethi-beach.ts
 *   tsx --require dotenv/config scripts/setup-rivethi-beach.ts --domain-only
 */
import { PrismaClient } from '@prisma/client';
import { addDomain } from '../lib/vercel-domains';
import { VERCEL_APEX_IP } from '../lib/vercel-domains';
import bcrypt from 'bcryptjs';
import {
  RIVETHI_BEACH_CONFIG,
  RIVETHI_BEACH_EXTRAS,
  RIVETHI_BEACH_POLICIES,
} from '../lib/guest-extras';

const prisma = new PrismaClient();
const domainOnly = process.argv.includes('--domain-only');

async function findTenant() {
  return prisma.tenant.findFirst({
    where: {
      OR: [
        { subdomain: RIVETHI_BEACH_CONFIG.subdomain },
        { domain: RIVETHI_BEACH_CONFIG.domain },
        { name: { contains: 'Rivethi', mode: 'insensitive' } },
        { amaldivesSlug: { contains: 'rivethi' } },
      ],
    },
    include: { properties: { take: 1 } },
  });
}

async function ensureTenant() {
  let tenant = await findTenant();
  if (tenant) {
    console.log(`Found tenant: ${tenant.name} (${tenant.subdomain})`);
    return tenant;
  }

  console.log('Creating Rivethi Beach tenant…');
  tenant = await prisma.tenant.create({
    data: {
      name: RIVETHI_BEACH_CONFIG.name,
      subdomain: RIVETHI_BEACH_CONFIG.subdomain,
      description: 'Rivethi Beach — beachfront guesthouse in the Maldives.',
      plan: 'free',
      status: 'ACTIVE',
      isVerifiedDirect: true,
      domain: RIVETHI_BEACH_CONFIG.domain,
      properties: {
        create: {
          name: RIVETHI_BEACH_CONFIG.name,
          address: '—',
          city: '—',
          state: '—',
          country: 'Maldives',
          zipCode: '—',
          phone: '—',
          email: RIVETHI_BEACH_CONFIG.email,
          website: RIVETHI_BEACH_CONFIG.website,
          currency: 'USD',
          timezone: 'Indian/Maldives',
          policies: RIVETHI_BEACH_POLICIES,
        },
      },
    },
    include: { properties: { take: 1 } },
  });
  console.log(`Created tenant ${tenant.subdomain}.stay.amaldives.com`);
  return tenant;
}

async function upsertServices(tenantId: string, propertyId: string) {
  for (const extra of RIVETHI_BEACH_EXTRAS) {
    const existing = await prisma.service.findFirst({
      where: { tenantId, name: extra.name, category: extra.category },
    });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          price: extra.price,
          description: extra.description,
          isActive: true,
          propertyId,
        },
      });
      console.log(`  Updated: ${extra.name}`);
    } else {
      await prisma.service.create({
        data: {
          tenantId,
          propertyId,
          name: extra.name,
          category: extra.category,
          price: extra.price,
          description: extra.description,
          isActive: true,
          images: [],
        },
      });
      console.log(`  Created: ${extra.name}`);
    }
  }
}

async function connectDomain(domain: string) {
  try {
    const status = await addDomain(domain);
    console.log(`  ${domain}: verified=${status.verified}`);
    if (!status.verified && status.records.length) {
      for (const r of status.records) {
        console.log(`    ${r.type}  ${r.name}  →  ${r.value}`);
      }
    }
  } catch (e) {
    console.warn(`  ${domain}: ${e instanceof Error ? e.message : e}`);
  }
}

async function ensureAdminUser(tenantId: string) {
  const email = 'admin@rivethibeach.mv';
  const password = await bcrypt.hash('rivethi123', 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Rivethi Admin',
      role: 'TENANT_ADMIN',
      tenantId,
      isActive: true,
      password,
    },
    create: {
      email,
      name: 'Rivethi Admin',
      role: 'TENANT_ADMIN',
      tenantId,
      isActive: true,
      password,
    },
  });
  console.log(`Admin ready: ${email} / rivethi123`);
  return user;
}

async function main() {
  const tenant = await ensureTenant();
  const property = tenant.properties[0];

  if (!domainOnly && property) {
    await prisma.property.update({
      where: { id: property.id },
      data: {
        email: RIVETHI_BEACH_CONFIG.email,
        website: RIVETHI_BEACH_CONFIG.website,
        policies: RIVETHI_BEACH_POLICIES,
      },
    });
    console.log('Property email & policies updated.');

    console.log('Upserting transfer & add-on services…');
    await upsertServices(tenant.id, property.id);
    await ensureAdminUser(tenant.id);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { domain: RIVETHI_BEACH_CONFIG.domain },
  });

  console.log('\nConnecting custom domain on Vercel…');
  await connectDomain(RIVETHI_BEACH_CONFIG.domain);
  await connectDomain(`www.${RIVETHI_BEACH_CONFIG.domain}`);

  console.log('\n── GoDaddy DNS for rivethibeach.com ──');
  console.log('  Type   Name   Value');
  console.log(`  A      @      ${VERCEL_APEX_IP}`);
  console.log('  CNAME  www    cname.vercel-dns.com');
  console.log('\nAfter DNS propagates, the site will be live at:');
  console.log(`  https://${RIVETHI_BEACH_CONFIG.domain}`);
  console.log(`  https://${tenant.subdomain}.stay.amaldives.com (always works)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
