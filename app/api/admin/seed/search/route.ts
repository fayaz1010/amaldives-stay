import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { searchHotels } from '@/lib/hotellook';

export const dynamic = 'force-dynamic';

/**
 * One-click setup, step 1.
 *
 * Owner types their guesthouse name (or a fragment) on /admin and we hit
 * Hotellook's open lookup endpoint to find matching Maldives properties.
 * We never write anything here — this is a pure search. The owner picks a
 * candidate, then /api/admin/seed/apply does the actual seeding.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['TENANT_ADMIN', 'OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const query = String(body?.query ?? '').trim();
    if (query.length < 2) {
      return NextResponse.json({ hits: [] });
    }

    const hits = await searchHotels(query, 5);
    return NextResponse.json({ hits });
  } catch (error) {
    console.error('Seed search error:', error);
    return NextResponse.json(
      { error: 'Search failed', hits: [] },
      { status: 500 }
    );
  }
}
