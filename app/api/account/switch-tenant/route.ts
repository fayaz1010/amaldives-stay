/**
 * POST /api/account/switch-tenant
 *
 * Switch the active tenant for the currently signed-in user. The signed-in
 * user must already be a member of the target tenant (we don't grant access
 * here, only switch between tenants they've already been added to).
 *
 * Body: { tenantId: string }
 *
 * On success returns { success: true, tenantId, subdomain }. The client
 * should reload to pick up the new active tenant — the JWT callback
 * refreshes memberships on each tick so the new tenantId is reflected in
 * the next session() call.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { tenantId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const targetTenantId = typeof body.tenantId === 'string' ? body.tenantId : null;
  if (!targetTenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  // Verify the signed-in user actually has a membership for the target tenant.
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: session.user.id, tenantId: targetTenantId } },
    include: { tenant: { select: { id: true, subdomain: true, status: true } } },
  });
  if (!membership || membership.tenant.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'No active membership for that tenant' }, { status: 403 });
  }

  // Flip the user's active tenant + sync their `role` to the role they hold
  // on the new tenant (so existing role-gated UI works after switch).
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      tenantId: targetTenantId,
      role: membership.role,
    },
  });

  return NextResponse.json({
    success: true,
    tenantId: membership.tenant.id,
    subdomain: membership.tenant.subdomain,
  });
}
