import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Resolve amaldives.com guesthouse slug → claim prefill data.
 * Query: ?slug=reef-view-guesthouse
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [{ amaldivesSlug: slug }, { subdomain: slug }],
    },
    select: { subdomain: true, name: true },
  });

  if (existing) {
    return NextResponse.json({
      claimed: true,
      subdomain: existing.subdomain,
      name: existing.name,
      stayUrl: `https://${existing.subdomain}.stay.amaldives.com`,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
    });
  }

  let listingName: string | null = null;
  const amaldivesDb = process.env.AMALDIVES_DATABASE_URL?.trim();
  if (amaldivesDb) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const ext = new PrismaClient({ datasources: { db: { url: amaldivesDb } } });
      const rows = await ext.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT name FROM guesthouses WHERE slug = $1 LIMIT 1`,
        slug
      );
      listingName = rows[0]?.name ?? null;
      await ext.$disconnect();
    } catch {
      // amaldives DB optional — fall back to slug humanize
    }
  }

  const humanName =
    listingName ??
    slug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return NextResponse.json({
    claimed: false,
    slug,
    name: humanName,
    suggestedSubdomain: slug.replace(/[^a-z0-9-]/g, '').slice(0, 48),
    amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
    claimUrl: `https://stay.amaldives.com/claim?guesthouse=${encodeURIComponent(slug)}`,
  });
}
