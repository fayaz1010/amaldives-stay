/**
 * GET   /api/admin/assistant — current assistant branding + embed snippet
 * PATCH /api/admin/assistant — update name / avatar / greeting / accent / enabled
 *
 * Stored in Tenant.settings.assistant. Powers the embeddable "Maya as a service"
 * widget the guesthouse drops on their own website.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readAssistantConfig } from '@/lib/assistant-config';
import { tenantUrl } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const CAN_MANAGE = ['TENANT_ADMIN', 'OWNER', 'MANAGER'];

async function loadTenant(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, subdomain: true, settings: true },
  });
}

function snippet(subdomain: string) {
  return `<script src="${tenantUrl(subdomain, '/maya.js')}" async></script>`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const t = await loadTenant(session.user.tenantId);
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    config: readAssistantConfig(t.settings, t.name),
    subdomain: t.subdomain,
    embedSnippet: snippet(t.subdomain),
    embedUrl: tenantUrl(t.subdomain, `/embed/assistant/${t.subdomain}`),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CAN_MANAGE.includes(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const t = await loadTenant(session.user.tenantId);
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const settings = (t.settings as Record<string, unknown> | null) ?? {};
  const prev = (settings.assistant as Record<string, unknown> | undefined) ?? {};
  const next: Record<string, unknown> = { ...prev };

  if ('name' in body) next.name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : prev.name;
  if ('greeting' in body) next.greeting = typeof body.greeting === 'string' ? body.greeting.trim().slice(0, 400) : prev.greeting;
  if ('avatarUrl' in body) next.avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl : null;
  if ('accentColor' in body) {
    const c = typeof body.accentColor === 'string' ? body.accentColor : '';
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) next.accentColor = c;
  }
  if ('enabled' in body) next.enabled = body.enabled !== false;

  await prisma.tenant.update({
    where: { id: t.id },
    data: { settings: { ...settings, assistant: next } as any },
  });

  return NextResponse.json({ success: true, config: readAssistantConfig({ assistant: next }, t.name) });
}
