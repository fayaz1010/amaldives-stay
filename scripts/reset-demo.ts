import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Find the Oyster Beach / demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { subdomain: 'oyster-residence' },
        { name: { contains: 'Oyster', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, subdomain: true },
  });

  if (!tenant) {
    console.log('No Oyster tenant found. Searching all tenants...');
    const all = await prisma.tenant.findMany({ select: { id: true, name: true, subdomain: true } });
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  console.log('Found tenant:', tenant.name, tenant.subdomain);

  const hashedPassword = await bcrypt.hash('demo1234', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@oysterbeachmaldives.com' },
    update: {
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      isActive: true,
    },
    create: {
      email: 'demo@oysterbeachmaldives.com',
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      isActive: true,
    },
  });

  console.log('Demo user ready:', user.email, '| password: demo1234 | role:', user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
