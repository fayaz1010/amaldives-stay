import { prisma } from '@/lib/db';

/** Compact property facts for AI prompts — "local knowledge" per tenant. */
export async function buildPropertyKnowledge(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      properties: {
        take: 1,
        include: {
          rooms: {
            where: { isActive: true },
            select: {
              name: true,
              number: true,
              type: true,
              capacity: true,
              basePrice: true,
              amenities: true,
              description: true,
            },
            take: 12,
          },
        },
      },
    },
  });

  if (!tenant) return '';

  const property = tenant.properties[0];
  const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
  const webProfile = (settings.webProfile as Record<string, unknown> | null) ?? {};

  const lines: string[] = [
    `Property: ${tenant.name}`,
    tenant.description ? `About: ${tenant.description}` : '',
    property
      ? [
          `Location: ${property.city}, ${property.state}, ${property.country}`,
          `Address: ${property.address}`,
          `Check-in: ${property.checkInTime}, Check-out: ${property.checkOutTime}`,
          `Phone: ${property.phone}, Email: ${property.email}`,
          property.amenities?.length ? `Amenities: ${property.amenities.join(', ')}` : '',
        ].filter(Boolean).join('\n')
      : '',
    webProfile.tagline ? `Tagline: ${webProfile.tagline}` : '',
    Array.isArray(webProfile.highlights) && webProfile.highlights.length
      ? `Highlights: ${(webProfile.highlights as string[]).join('; ')}`
      : '',
  ].filter(Boolean);

  if (property?.rooms?.length) {
    lines.push('Rooms:');
    for (const r of property.rooms) {
      lines.push(
        `- ${r.name || r.number} (${r.type}): sleeps ${r.capacity}, from $${r.basePrice}/night` +
          (r.description ? ` — ${r.description.slice(0, 120)}` : '')
      );
    }
  }

  return lines.join('\n');
}

export async function buildPropertyKnowledgeBySubdomain(subdomain: string): Promise<string> {
  const tenant = await prisma.tenant.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [{ subdomain }, { amaldivesSlug: subdomain }],
    },
    select: { id: true },
  });
  if (!tenant) return '';
  return buildPropertyKnowledge(tenant.id);
}
