import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function finalizeTenantClaim(input: {
  tenantId: string;
  email: string;
  password: string;
  ownerName: string;
}): Promise<{ subdomain: string; stayUrl: string; loginUrl: string }> {
  const email = input.email.trim().toLowerCase();
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, subdomain: true, settings: true, amaldivesSlug: true },
  });
  if (!tenant) throw new Error('Tenant not found');

  const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
  if (settings.claimable === false) {
    throw new Error('This property is already claimed. Please sign in instead.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: input.ownerName,
        password: hashedPassword,
        role: 'TENANT_ADMIN',
        tenantId: tenant.id,
        staffProfile: {
          create: {
            tenantId: tenant.id,
            department: 'Management',
            position: 'Owner',
            hireDate: new Date(),
            permissions: [],
          },
        },
      },
    });

    await tx.tenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: 'TENANT_ADMIN', isDefault: true },
      create: { userId: user.id, tenantId: tenant.id, role: 'TENANT_ADMIN', isDefault: true },
    });

    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: {
          ...settings,
          claimable: false,
          claimedAt: new Date().toISOString(),
          claimedByEmail: email,
        } as any,
      },
    });

    // Sync property contact email to verified owner address.
    await tx.property.updateMany({
      where: { tenantId: tenant.id },
      data: { email },
    });
  });

  const stayUrl = `https://${tenant.subdomain}.stay.amaldives.com`;
  return {
    subdomain: tenant.subdomain,
    stayUrl,
    loginUrl: `${stayUrl}/auth/signin`,
  };
}
