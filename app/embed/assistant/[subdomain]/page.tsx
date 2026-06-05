import { prisma } from '@/lib/db';
import { readAssistantConfig } from '@/lib/assistant-config';
import { AssistantWidget } from '@/components/embed/assistant-widget';

export const dynamic = 'force-dynamic';

/**
 * Embeddable assistant widget, served per tenant subdomain. Loaded inside an
 * iframe by /maya.js on the guesthouse's OWN website. Renders the branded
 * floating bubble + chat panel and posts resize messages to the parent frame.
 * Same-origin to /api/public/[subdomain]/assistant (no CORS needed).
 */
export default async function AssistantEmbedPage({
  params,
}: {
  params: { subdomain: string };
}) {
  const { subdomain } = params;
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE', OR: [{ subdomain }, { amaldivesSlug: subdomain }] },
    select: { name: true, subdomain: true, settings: true },
  });

  if (!tenant) return <div data-maya="not-found" />;

  const cfg = readAssistantConfig(tenant.settings, tenant.name);
  if (!cfg.enabled) return <div data-maya="disabled" />;

  return (
    <AssistantWidget
      subdomain={tenant.subdomain}
      propertyName={tenant.name}
      name={cfg.name}
      avatarUrl={cfg.avatarUrl}
      greeting={cfg.greeting}
      accentColor={cfg.accentColor}
    />
  );
}
