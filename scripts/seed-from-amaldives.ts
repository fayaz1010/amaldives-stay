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

const OYSTER_ROOMS = [
  { number: '101', name: 'Garden View Room', type: 'STANDARD' as const, capacity: 2, basePrice: 89, bedType: 'King Bed', size: 28, amenities: ['Air Conditioning', 'Free WiFi', 'En-suite Bathroom', 'Flat Screen TV', 'Minibar'] },
  { number: '102', name: 'Garden View Room', type: 'STANDARD' as const, capacity: 2, basePrice: 89, bedType: 'Twin Beds', size: 28, amenities: ['Air Conditioning', 'Free WiFi', 'En-suite Bathroom', 'Flat Screen TV', 'Minibar'] },
  { number: '201', name: 'Beachfront Deluxe Room', type: 'DELUXE' as const, capacity: 2, basePrice: 149, bedType: 'King Bed', size: 38, amenities: ['Air Conditioning', 'Free WiFi', 'Sea View', 'Private Balcony', 'En-suite Bathroom', 'Flat Screen TV', 'Minibar', 'Coffee Machine'] },
  { number: '202', name: 'Beachfront Deluxe Room', type: 'DELUXE' as const, capacity: 3, basePrice: 159, bedType: 'King + Single Bed', size: 40, amenities: ['Air Conditioning', 'Free WiFi', 'Sea View', 'Private Balcony', 'En-suite Bathroom', 'Flat Screen TV', 'Minibar', 'Coffee Machine'] },
  { number: '301', name: 'Ocean Suite', type: 'SUITE' as const, capacity: 2, basePrice: 229, bedType: 'King Bed', size: 55, amenities: ['Air Conditioning', 'Free WiFi', 'Panoramic Sea View', 'Private Terrace', 'Jacuzzi', 'Living Area', 'En-suite Bathroom', 'Flat Screen TV', 'Minibar', 'Coffee Machine', 'Room Service'] },
  { number: '401', name: 'Family Room', type: 'FAMILY' as const, capacity: 4, basePrice: 199, bedType: 'King + 2 Single Beds', size: 52, amenities: ['Air Conditioning', 'Free WiFi', 'En-suite Bathroom', 'Flat Screen TV', 'Minibar', 'Extra Beds Available'] },
];

async function seedGuesthouses() {
  for (const gh of SAMPLE_GUESTHOUSES) {
    const subdomain = gh.slug;
    const existing = await prisma.tenant.findUnique({ where: { subdomain } });
    if (existing) { console.log('SKIP:', gh.name); continue; }
    const ownerEmail = 'manager@' + subdomain + '.vayves.com';
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

    // Add rooms for Oyster Residence demo
    if (subdomain === 'oyster-residence') {
      const property = await prisma.property.findFirst({ where: { tenantId: tenant.id } });
      if (property) {
        for (const r of OYSTER_ROOMS) {
          await prisma.room.create({
            data: {
              tenantId: tenant.id,
              propertyId: property.id,
              number: r.number,
              name: r.name,
              type: r.type,
              capacity: r.capacity,
              basePrice: r.basePrice,
              bedType: r.bedType,
              size: r.size,
              amenities: r.amenities,
              description: `${r.name} at ${gh.name}, ${gh.island}. Sleeps ${r.capacity}.`,
              status: 'AVAILABLE',
            }
          });
        }
        console.log('Added', OYSTER_ROOMS.length, 'rooms to Oyster Residence');
      }
    }

    const tempPassword = await bcrypt.hash('OysterDemo@2026', 12);
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
    console.log('Created:', gh.name, '->', subdomain + '.vayves.com', '| login:', ownerEmail);
  }
}

async function main() {
  console.log('Vayves — Seeding');
  await seedSuperAdmin();
  await seedGuesthouses();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
