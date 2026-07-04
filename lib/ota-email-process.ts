/**
 * OTA email pipeline orchestrator.
 *
 * Ties together the three stages for every inbound OTA notification email:
 *   1. parseOtaEmail()   — cheap regex extraction (lib/ota-email-parse.ts)
 *   2. verifyOtaEmail()  — mandatory Gemini independent read + reconciliation
 *                          (lib/ota-email-verify.ts)
 *   3. ingestOtaEmailBooking() — create/update/cancel the Booking, ONLY when
 *      Gemini confirms the essentials with no unresolved discrepancy
 *      (lib/ota-email-ingest.ts)
 *
 * Every email — whether auto-applied, queued for review, or unresolved to a
 * tenant at all — gets exactly one OtaEmailMessage row. That's the audit
 * trail, the manual-review queue, and future model-training data all in one
 * place.
 */
import { prisma } from '@/lib/db';
import { queueNotification } from '@/lib/notifications';
import { parseOtaEmail, detectSource, type RawEmail } from '@/lib/ota-email-parse';
import { verifyOtaEmail } from '@/lib/ota-email-verify';
import { ingestOtaEmailBooking, type IngestResult } from '@/lib/ota-email-ingest';
import type { OtaMessageStatus } from '@prisma/client';

export interface ProcessOtaEmailResult {
  otaMessageId: string;
  status: OtaMessageStatus;
  bookingId?: string;
  reason?: string;
}

/**
 * Process one inbound OTA email for a resolved tenant. Never throws —
 * failures degrade to a NEEDS_REVIEW/FAILED audit row rather than losing
 * the email.
 */
export async function processOtaEmail(
  email: RawEmail,
  tenant: { id: string; subdomain: string }
): Promise<ProcessOtaEmailResult> {
  const regexResult = parseOtaEmail(email);

  let verification;
  try {
    verification = await verifyOtaEmail(email, regexResult, tenant.id);
  } catch (err) {
    verification = {
      verified: false,
      confidence: 0,
      final: regexResult,
      discrepancies: [],
      aiRaw: null,
      aiError: err instanceof Error ? err.message : String(err),
    };
  }

  const source = regexResult?.source ?? detectSource(email);

  // Not verified (low confidence, missing essentials, or a critical
  // regex/AI disagreement) — queue for a human, don't guess.
  if (!verification.verified || !verification.final) {
    const message = await prisma.otaEmailMessage.create({
      data: {
        tenantId: tenant.id,
        fromAddress: email.from || '',
        toAddress: email.to || '',
        subject: email.subject || '',
        rawText: email.text ?? null,
        rawHtml: email.html ?? null,
        source,
        regexResult: (regexResult ?? undefined) as never,
        aiResult: (verification.aiRaw ?? undefined) as never,
        discrepancies: (verification.discrepancies.length ? verification.discrepancies : undefined) as never,
        confidence: verification.confidence,
        status: 'NEEDS_REVIEW',
      },
    });
    await notifyStaffOfReview(tenant.id, message.id, source, verification.aiError);
    return { otaMessageId: message.id, status: 'NEEDS_REVIEW', reason: verification.aiError };
  }

  // Verified — safe to create/update/cancel the booking from Gemini's
  // reconciled values.
  let ingestResult: IngestResult;
  try {
    ingestResult = await ingestOtaEmailBooking(tenant.id, verification.final);
  } catch (err) {
    const message = await prisma.otaEmailMessage.create({
      data: {
        tenantId: tenant.id,
        fromAddress: email.from || '',
        toAddress: email.to || '',
        subject: email.subject || '',
        rawText: email.text ?? null,
        rawHtml: email.html ?? null,
        source,
        regexResult: (regexResult ?? undefined) as never,
        aiResult: (verification.aiRaw ?? undefined) as never,
        confidence: verification.confidence,
        status: 'FAILED',
      },
    });
    const reason = err instanceof Error ? err.message : String(err);
    await notifyStaffOfReview(tenant.id, message.id, source, reason);
    return { otaMessageId: message.id, status: 'FAILED', reason };
  }

  // ingestOtaEmailBooking can still say "skipped" for reasons unrelated to
  // AI confidence (e.g. cancellation for an unknown reservation, tenant has
  // no rooms). Route those to review too rather than silently dropping them.
  const statusMap: Record<IngestResult['status'], OtaMessageStatus> = {
    created: 'CREATED',
    updated: 'UPDATED',
    cancelled: 'CANCELLED',
    skipped: 'NEEDS_REVIEW',
  };
  const status = statusMap[ingestResult.status];

  const message = await prisma.otaEmailMessage.create({
    data: {
      tenantId: tenant.id,
      fromAddress: email.from || '',
      toAddress: email.to || '',
      subject: email.subject || '',
      rawText: email.text ?? null,
      rawHtml: email.html ?? null,
      source,
      regexResult: (regexResult ?? undefined) as never,
      aiResult: (verification.aiRaw ?? undefined) as never,
      discrepancies: (verification.discrepancies.length ? verification.discrepancies : undefined) as never,
      confidence: verification.confidence,
      status,
      bookingId: ingestResult.bookingId ?? null,
    },
  });

  if (status === 'NEEDS_REVIEW') {
    await notifyStaffOfReview(tenant.id, message.id, source, ingestResult.reason);
  }

  return { otaMessageId: message.id, status, bookingId: ingestResult.bookingId, reason: ingestResult.reason };
}

/** Records an email whose recipient couldn't be resolved to any tenant, so a misconfigured OTA notification address is still visible somewhere instead of vanishing. */
export async function recordUnresolvedOtaEmail(email: RawEmail, reason: string): Promise<string> {
  const message = await prisma.otaEmailMessage.create({
    data: {
      tenantId: null,
      fromAddress: email.from || '',
      toAddress: email.to || '',
      subject: email.subject || '',
      rawText: email.text ?? null,
      rawHtml: email.html ?? null,
      source: detectSource(email),
      status: 'FAILED',
      discrepancies: { reason } as never,
    },
  });
  return message.id;
}

async function notifyStaffOfReview(tenantId: string, messageId: string, source: string, reason?: string) {
  try {
    const admin = await prisma.tenantMembership.findFirst({
      where: { tenantId, role: 'TENANT_ADMIN' },
      include: { user: { select: { email: true } } },
      orderBy: { isDefault: 'desc' },
    });
    const to = admin?.user?.email;
    if (!to) return;
    await queueNotification({
      tenantId,
      channel: 'EMAIL',
      type: 'OTA_EMAIL_NEEDS_REVIEW',
      to,
      subject: `Action needed: an OTA booking email from ${source} needs review`,
      body:
        `<p>An inbound OTA (${source}) reservation email couldn't be auto-confirmed and is waiting in your ` +
        `<strong>OTA Import Review</strong> queue.</p>` +
        (reason ? `<p>Reason: ${escapeHtml(reason)}</p>` : '') +
        `<p><a href="https://stay.amaldives.com/admin/bookings/ota-review">Review it now</a></p>`,
      payload: { otaMessageId: messageId },
    });
  } catch {
    /* alerting is best-effort; never let it block the ingest response */
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
