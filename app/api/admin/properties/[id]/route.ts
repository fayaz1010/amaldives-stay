/**
 * PATCH /api/admin/properties/[id] — update a property (general + tax/MIRA config).
 *
 * Tax config is per property because each files its own MIRA return. Only
 * owners/admins may edit. The property must belong to the caller's tenant.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CAN_MANAGE = ['TENANT_ADMIN', 'OWNER'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!CAN_MANAGE.includes(session.user.role)) {
    return NextResponse.json({ error: 'Only an owner or admin can edit a property' }, { status: 403 });
  }

  const { id } = await params;
  const owned = await prisma.property.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: 'Property not found for this account' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Coercion helpers — only set fields that were actually provided.
  const data: Record<string, unknown> = {};
  const strFields = ['name', 'description', 'address', 'city', 'state', 'country', 'zipCode', 'phone', 'email', 'website', 'taxTin'];
  for (const f of strFields) {
    if (f in body) data[f] = typeof body[f] === 'string' ? (body[f] as string).trim() || null : null;
  }
  // name must never be nulled
  if ('name' in data && !data.name) delete data.name;

  const rateFields = ['tgstRate', 'greenTaxUsdPerNight', 'serviceChargeRate'];
  for (const f of rateFields) {
    if (f in body) {
      const v = body[f];
      if (v === null || v === '') data[f] = null;
      else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: `${f} must be a non-negative number` }, { status: 400 });
        }
        data[f] = n;
      }
    }
  }
  if ('taxSettings' in body && body.taxSettings && typeof body.taxSettings === 'object') {
    data.taxSettings = body.taxSettings;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
  }

  const property = await prisma.property.update({
    where: { id },
    data,
    select: {
      id: true, name: true, taxTin: true, tgstRate: true,
      greenTaxUsdPerNight: true, serviceChargeRate: true,
    },
  });
  return NextResponse.json({ success: true, property });
}
