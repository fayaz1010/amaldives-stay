/**
 * OTA onboarding stall nudges.
 *
 * Connecting OTA bookings (Channel Manager: iCal + auto-import email) is one
 * of the highest-value things a new tenant can set up, but it's easy to miss
 * during onboarding since it isn't required to start taking direct bookings.
 * This job finds tenants who never connected any channel and:
 *
 *   1. Emails the tenant admin a friendly reminder, every ~4 days.
 *   2. After a week stalled, also alerts platform ops (Fayaz) with the
 *      owner's contact details AND a ready-to-send WhatsApp (`wa.me`) link
 *      pre-filled with a personal outreach message — one click to open
 *      WhatsApp with the draft ready, no bot/API required, Fayaz stays in
 *      control of what actually gets sent.
 *
 * State (stage/last-nudged/count) lives in `Tenant.settings.otaStallNudge`
 * since there's no dedicated lifecycle table — cheap and good enough for a
 * once-daily cron.
 */
import { prisma } from '@/lib/db';
import { queueNotification } from '@/lib/notifications';

const FIRST_NUDGE_AFTER_DAYS = 3;
const OPS_ESCALATION_AFTER_DAYS = 7;
const RENUDGE_COOLDOWN_DAYS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

interface StallState {
  stage: 'tenant_reminder' | 'ops_escalated';
  lastNudgedAt: string;
  nudgeCount: number;
}

export interface OtaNudgeSummary {
  checked: number;
  candidates: number;
  tenantReminders: number;
  opsEscalations: number;
  skippedCooldown: number;
}

export async function runOtaOnboardingNudge(): Promise<OtaNudgeSummary> {
  const cutoff = new Date(Date.now() - FIRST_NUDGE_AFTER_DAYS * DAY_MS);

  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE', createdAt: { lte: cutoff } },
    select: {
      id: true,
      name: true,
      subdomain: true,
      createdAt: true,
      settings: true,
      properties: { select: { phone: true, email: true }, take: 1 },
    },
  });

  const summary: OtaNudgeSummary = {
    checked: tenants.length,
    candidates: 0,
    tenantReminders: 0,
    opsEscalations: 0,
    skippedCooldown: 0,
  };

  for (const tenant of tenants) {
    const settings = ((tenant.settings as Record<string, unknown>) ?? {}) as Record<string, unknown>;

    // Auto-provisioned shells nobody has claimed yet have no real owner to
    // nudge — skip until claimed.
    if (settings.autoProvisioned && settings.claimable !== false) continue;

    const [otaSuccessCount, feedCount] = await Promise.all([
      prisma.otaEmailMessage.count({
        where: { tenantId: tenant.id, status: { in: ['CREATED', 'UPDATED'] } },
      }),
      prisma.externalCalendarFeed.count({ where: { tenantId: tenant.id } }),
    ]);
    if (otaSuccessCount > 0 || feedCount > 0) continue; // already connected

    summary.candidates++;

    const stall = (settings.otaStallNudge as StallState | undefined) ?? null;
    const daysSinceSignup = Math.floor((Date.now() - tenant.createdAt.getTime()) / DAY_MS);
    const daysSinceLastNudge = stall
      ? Math.floor((Date.now() - new Date(stall.lastNudgedAt).getTime()) / DAY_MS)
      : Infinity;

    if (stall && daysSinceLastNudge < RENUDGE_COOLDOWN_DAYS) {
      summary.skippedCooldown++;
      continue;
    }

    const admin = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.id, role: 'TENANT_ADMIN' },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { isDefault: 'desc' },
    });
    const property = tenant.properties[0] ?? null;

    if (admin?.user?.email) {
      await queueNotification({
        tenantId: tenant.id,
        channel: 'EMAIL',
        type: 'OTA_ONBOARDING_STALL_REMINDER',
        to: admin.user.email,
        subject: `Don't miss OTA bookings — connect ${tenant.name} in 1 minute`,
        body: reminderEmailHtml(tenant.name),
      });
      summary.tenantReminders++;
    }

    const shouldEscalateToOps = daysSinceSignup >= OPS_ESCALATION_AFTER_DAYS;
    if (shouldEscalateToOps) {
      await notifyOpsOfStalledTenant({
        tenantId: tenant.id,
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        ownerName: admin?.user?.name ?? null,
        ownerEmail: admin?.user?.email ?? property?.email ?? null,
        ownerPhone: property?.phone ?? null,
        daysSinceSignup,
      });
      summary.opsEscalations++;
    }

    const newStall: StallState = {
      stage: shouldEscalateToOps ? 'ops_escalated' : 'tenant_reminder',
      lastNudgedAt: new Date().toISOString(),
      nudgeCount: (stall?.nudgeCount ?? 0) + 1,
    };
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { settings: { ...settings, otaStallNudge: newStall } as never },
    });
  }

  return summary;
}

interface OpsAlertInput {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  daysSinceSignup: number;
}

async function notifyOpsOfStalledTenant(input: OpsAlertInput) {
  const opsEmail = process.env.OTA_NUDGE_OPS_EMAIL || process.env.ADMIN_EMAIL;
  if (!opsEmail) return;

  const waLink = input.ownerPhone ? buildWaMeLink(input.ownerPhone, draftWhatsAppMessage(input)) : null;

  await queueNotification({
    tenantId: input.tenantId,
    channel: 'EMAIL',
    type: 'OTA_ONBOARDING_STALL_OPS_ALERT',
    to: opsEmail,
    subject: `🟠 OTA setup stalled ${input.daysSinceSignup}d — ${input.tenantName} (${input.subdomain})`,
    body: opsAlertHtml(input, waLink),
    payload: {
      tenantId: input.tenantId,
      subdomain: input.subdomain,
      ownerEmail: input.ownerEmail,
      ownerPhone: input.ownerPhone,
      waLink,
    },
  });
}

function draftWhatsAppMessage(input: OpsAlertInput): string {
  const name = input.ownerName?.split(' ')[0] || 'there';
  return (
    `Hi ${name}! This is Fayaz from Vayves 👋 Noticed ${input.tenantName} hasn't connected ` +
    `Booking.com/Airbnb yet — takes about a minute and means you'll never miss or double-book a reservation. ` +
    `Want me to walk you through it, or would a quick call be easier?`
  );
}

function buildWaMeLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function reminderEmailHtml(tenantName: string): string {
  return (
    `<p>Quick reminder — <strong>${escapeHtml(tenantName)}</strong> isn't receiving OTA bookings automatically yet.</p>` +
    `<p>Connecting Booking.com, Airbnb, Agoda or any other channel takes about a minute and means new reservations ` +
    `appear here automatically, verified by AI — nothing to double-check, nothing to miss.</p>` +
    `<p><a href="https://vayves.com/admin/web?tab=channels">Connect your channels now</a></p>`
  );
}

function opsAlertHtml(input: OpsAlertInput, waLink: string | null): string {
  return (
    `<p><strong>${escapeHtml(input.tenantName)}</strong> (${escapeHtml(input.subdomain)}) has been stalled on OTA ` +
    `setup for ${input.daysSinceSignup} days — no iCal feed, no OTA email connected.</p>` +
    `<ul>` +
    `<li>Owner: ${escapeHtml(input.ownerName ?? 'unknown')}${input.ownerEmail ? ` — ${escapeHtml(input.ownerEmail)}` : ''}</li>` +
    `<li>Phone: ${input.ownerPhone ? escapeHtml(input.ownerPhone) : 'not on file'}</li>` +
    `</ul>` +
    (waLink
      ? `<p><a href="${waLink}">Open WhatsApp with a draft message ready to send →</a></p>`
      : `<p>No phone on file — reach out by email or ask them to add one in Property settings.</p>`) +
    `<p><a href="https://vayves.com/super-admin">View in Super Admin</a></p>`
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
