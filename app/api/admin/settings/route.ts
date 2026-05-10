import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const allowedRoles = ['TENANT_ADMIN', 'MANAGER'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data = await request.json();
    const tenantId = session.user.tenantId;

    const tenantUpdates: any = {};
    if (data.name !== undefined) tenantUpdates.name = data.name;
    if (data.description !== undefined) tenantUpdates.description = data.description;
    if (data.settings !== undefined) tenantUpdates.settings = data.settings;

    const propertyUpdates: any = {};
    if (data.address !== undefined) propertyUpdates.address = data.address;
    if (data.city !== undefined) propertyUpdates.city = data.city;
    if (data.state !== undefined) propertyUpdates.state = data.state;
    if (data.phone !== undefined) propertyUpdates.phone = data.phone;
    if (data.email !== undefined) propertyUpdates.email = data.email;

    const result = await prisma.$transaction(async (tx) => {
      let tenant = null;
      if (Object.keys(tenantUpdates).length > 0) {
        tenant = await tx.tenant.update({
          where: { id: tenantId },
          data: tenantUpdates,
        });
      } else {
        tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      }

      let property = null;
      if (Object.keys(propertyUpdates).length > 0) {
        const existing = await tx.property.findFirst({ where: { tenantId } });
        if (existing) {
          property = await tx.property.update({
            where: { id: existing.id },
            data: propertyUpdates,
          });
        }
      } else {
        property = await tx.property.findFirst({ where: { tenantId } });
      }

      return { tenant, property };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
