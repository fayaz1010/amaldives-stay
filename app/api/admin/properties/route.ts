/**
 * GET  /api/admin/properties  — list all properties for the active tenant
 * POST /api/admin/properties  — create a new property under the active tenant
 *
 * Multi-property: a Tenant owns 1..N properties. Only owners/admins may add
 * one. New properties start with sensible Maldives defaults; the owner fills
 * in the rest (and per-property MIRA/tax config) from Settings afterwards.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CAN_MANAGE = ['TENANT_ADMIN', 'OWNER'];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const properties = await prisma.property.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, city: true, address: true, isActive: true,
      _count: { select: { rooms: true, bookings: true } },
    },
  });
  return NextResponse.json({ properties });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!CAN_MANAGE.includes(session.user.role)) {
    return NextResponse.json({ error: 'Only an owner or admin can add a property' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const str = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

  const property = await prisma.property.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      description: str(body.description) || null,
      address: str(body.address),
      city: str(body.city || body.island), // island maps to city for Maldives
      state: str(body.state || body.atoll),
      country: str(body.country, 'Maldives'),
      zipCode: str(body.zipCode),
      phone: str(body.phone),
      email: str(body.email),
      currency: str(body.currency, 'USD'),
      timezone: str(body.timezone, 'Indian/Maldives'),
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ success: true, property });
}
