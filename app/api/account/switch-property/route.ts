/**
 * POST /api/account/switch-property
 *
 * Switch the active property within the caller's current tenant. The property
 * MUST belong to the signed-in user's active tenant — we never switch across
 * tenants here. The choice is stored in a per-browser cookie; server helpers
 * (lib/active-property) read and re-validate it on every request.
 *
 * Body: { propertyId: string }
 * Returns: { success: true, propertyId, name }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ACTIVE_PROPERTY_COOKIE } from '@/lib/active-property';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { propertyId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId : null;
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
  }

  // The property must belong to the caller's active tenant.
  const property = await prisma.property.findFirst({
    where: { id: propertyId, tenantId: session.user.tenantId },
    select: { id: true, name: true },
  });
  if (!property) {
    return NextResponse.json({ error: 'Property not found for this account' }, { status: 403 });
  }

  const res = NextResponse.json({ success: true, propertyId: property.id, name: property.name });
  res.cookies.set(ACTIVE_PROPERTY_COOKIE, property.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
