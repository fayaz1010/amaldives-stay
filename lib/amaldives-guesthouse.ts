export type AmaldivesGuesthouseRow = {
  slug: string;
  name: string;
  email: string | null;
  website: string | null;
  island: string | null;
  atoll: string | null;
  phone: string | null;
  adminStatus: string | null;
};

let _ext: import('@prisma/client').PrismaClient | null = null;

async function getAmaldivesClient(): Promise<import('@prisma/client').PrismaClient | null> {
  const url = process.env.AMALDIVES_DATABASE_URL?.trim();
  if (!url) return null;
  if (_ext) return _ext;
  const { PrismaClient } = await import('@prisma/client');
  _ext = new PrismaClient({ datasources: { db: { url } } });
  return _ext;
}

export async function fetchAmaldivesGuesthouse(
  slug: string
): Promise<AmaldivesGuesthouseRow | null> {
  const ext = await getAmaldivesClient();
  if (!ext) return null;

  try {
    const rows = await ext.$queryRawUnsafe<
      Array<{
        slug: string;
        name: string;
        email: string | null;
        website: string | null;
        island: string | null;
        atoll: string | null;
        phone: string | null;
        admin_status: string | null;
      }>
    >(
      `SELECT slug, name, email, website, island, atoll, phone, admin_status
       FROM guesthouses WHERE slug = $1 LIMIT 1`,
      slug
    );
    const row = rows[0];
    if (!row) return null;
    return {
      slug: row.slug,
      name: row.name,
      email: row.email,
      website: row.website,
      island: row.island,
      atoll: row.atoll,
      phone: row.phone,
      adminStatus: row.admin_status,
    };
  } catch (err) {
    console.error('[amaldives-guesthouse] query failed', err);
    return null;
  }
}

export async function listProvisionableGuesthouses(limit = 200): Promise<AmaldivesGuesthouseRow[]> {
  const ext = await getAmaldivesClient();
  if (!ext) return [];

  try {
    const rows = await ext.$queryRawUnsafe<
      Array<{
        slug: string;
        name: string;
        email: string | null;
        website: string | null;
        island: string | null;
        atoll: string | null;
        phone: string | null;
        admin_status: string | null;
      }>
    >(
      `SELECT slug, name, email, website, island, atoll, phone, admin_status
       FROM guesthouses
       WHERE admin_status = 'active'
         AND (NULLIF(TRIM(email), '') IS NOT NULL OR NULLIF(TRIM(website), '') IS NOT NULL)
       ORDER BY updated_at DESC NULLS LAST
       LIMIT $1`,
      limit
    );
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      email: row.email,
      website: row.website,
      island: row.island,
      atoll: row.atoll,
      phone: row.phone,
      adminStatus: row.admin_status,
    }));
  } catch (err) {
    console.error('[amaldives-guesthouse] list failed', err);
    return [];
  }
}
