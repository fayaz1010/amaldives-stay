import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SAMPLE_GUESTHOUSES = [
  { name: 'Oyster Residence', slug: 'oyster-residence', island: 'Maafushi', atoll: 'South Male' },
  { name: 'Kaani Beach Hotel', slug: 'kaani-beach-hotel', island: 'Maafushi', atoll: 'South Male' },
  { name: 'Summer Island Maldives', slug: 'summer-island-maldives', island: 'Ziyaaraiyfushi', atoll: 'North Male' },
  { name: 'Koimala Hotel', slug: 'koimala-hotel', island: 'Thulusdhoo', atoll: 'North Male' },
  { name: 'Reethi Beach Guesthouse', slug: 'reethi-beach-guesthouse', island: 'Rasdhoo', atoll: 'Ari' },
];

async function seedSuperAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@amaldives.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) { console.log('Super admin exists:', adminEmail); return existing; }
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPass@2026', 12);
  const admin = await prisma.user.create({
    data: { email: adminEmail, name: 'AMaldives Admin', password: hashedPassword, role: 'SUPER_ADMIN' }
  });
  console.log('Created super admin:', adminEmail);
  return admin;
}

async function seedGuesthouses() {
  for (const gh of SAMPLE_GUESTHOUSES) {
    const subdomain = gh.slug;
    const existing = await prisma.tenant.findUnique({ where: { subdomain } });
    if (existing) { console.log('SKIP:', gh.name); continue; }
    const ownerEmail = 'manager@' + subdomain + '.stay.amaldives.com';
    const tenant = await prisma.tenant.create({
      data: {
        name: gh.name,
        subdomain,
        description: gh.name + ' — local island guesthouse in ' + gh.island + ', ' + gh.atoll + ' Atoll, Maldives.',
        plan: 'free',
        status: 'ACTIVE',
        properties: {
          create: {
            name: gh.name,
            address: gh.island,
            city: gh.island,
            state: gh.atoll,
            country: 'Maldives',
            zipCode: '00000',
            phone: '+960 000 0000',
            email: ownerEmail,
            currency: 'USD',
            timezone: 'Indian/Maldives',
          }
        }
      }
    });
    const tempPassword = await bcrypt.hash('TempPass@2026', 12);
    await prisma.user.create({
      data: {
        email: ownerEmail,
        name: gh.name + ' Manager',
        password: tempPassword,
        role: 'TENANT_ADMIN',
        tenantId: tenant.id,
        staffProfile: {
          create: { tenantId: tenant.id, department: 'Management', position: 'Property Manager', hireDate: new Date() }
        }
      }
    });
    console.log('Created:', gh.name, '->', subdomain + '.stay.amaldives.com');
  }
}

async function main() {
  console.log('amaldives STAY — Seeding');
  await seedSuperAdmin();
  await seedGuesthouses();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
