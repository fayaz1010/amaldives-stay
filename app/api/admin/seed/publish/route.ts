import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Flip a draft-mode tenant to published.
 *
 * After /api/admin/seed/apply runs, the tenant is marked as DRAFT so the
 * public storefront shows a "coming soon" notice. The owner reviews the
 * seeded data on /admin/web, fixes anything wrong, then hits this endpoint
 * (via the "Publish" banner on /admin) to go live.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['TENANT_ADMIN', 'OWNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const existingSettings = (t?.settings as Record<string, unknown> | null) ?? {};
    const nextSettings = { ...existingSettings, draftMode: false, publishedAt: new Date().toISOString() };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: nextSettings },
    });

    return NextResponse.json({ success: true, draftMode: false });
  } catch (error) {
    console.error('Seed publish error:', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
