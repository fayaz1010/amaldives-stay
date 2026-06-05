/**
 * GET   /api/admin/settings/sharing  — current per-category sharing config
 * PATCH /api/admin/settings/sharing  — update it (owner/admin only)
 *
 * Stored in Tenant.settings.sharing. Controls whether each resource category is
 * shared across all properties or scoped per property. See lib/property-sharing.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SHARE_CATEGORIES, readSharing, type ShareCategory } from '@/lib/property-sharing';

export const dynamic = 'force-dynamic';

const CAN_MANAGE = ['TENANT_ADMIN', 'OWNER'];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const t = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { settings: true } });
  return NextResponse.json({ sharing: readSharing(t?.settings) });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_MANAGE.includes(session.user.role)) {
    return NextResponse.json({ error: 'Only an owner or admin can change sharing' }, { status: 403 });
  }

  let body: { sharing?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.sharing || typeof body.sharing !== 'object') {
    return NextResponse.json({ error: 'sharing object required' }, { status: 400 });
  }

  // Only accept known categories as booleans.
  const clean: Partial<Record<ShareCategory, boolean>> = {};
  for (const c of SHARE_CATEGORIES) {
    if (typeof body.sharing[c] === 'boolean') clean[c] = body.sharing[c] as boolean;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as Record<string, unknown> | null) ?? {};
  const prevSharing = (settings.sharing as Record<string, unknown> | undefined) ?? {};

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { settings: { ...settings, sharing: { ...prevSharing, ...clean } } as any },
  });

  return NextResponse.json({ success: true, sharing: readSharing({ sharing: { ...prevSharing, ...clean } }) });
}
