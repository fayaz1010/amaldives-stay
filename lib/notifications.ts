/**
 * Notification hub — persistent outbox (TASK-11).
 *
 * `queueNotification` writes a row; `sendPendingNotifications` reads rows
 * whose `scheduledFor` has passed and delivers them. Today only the EMAIL
 * channel is wired (Resend) — SMS/WHATSAPP rows stay PENDING until those
 * transports land (TASK-09). Failed sends are retried up to MAX_ATTEMPTS
 * before being marked FAILED so they don't keep churning forever.
 *
 * The cron entrypoint that calls sendPendingNotifications lands in TASK-11b;
 * this module is intentionally importable without a cron in place so other
 * tasks (TASK-06 flight ETA, TASK-08 pre-arrival) can already enqueue.
 */
import { prisma } from '@/lib/db';
import { getResend } from '@/lib/email';
import type { Notification, NotificationChannel } from '@prisma/client';

const MAX_ATTEMPTS = 3;
const FROM_NAME = 'amaldives STAY';

export interface QueueNotificationInput {
  tenantId: string;
  bookingId?: string | null;
  channel?: NotificationChannel;
  /** Free-form discriminator, e.g. "BOOKING_CONFIRMATION", "ARRIVAL_REMINDER". */
  type: string;
  /** Email address for EMAIL, phone number for SMS/WHATSAPP. */
  to: string;
  subject?: string;
  /** HTML for EMAIL, plain text for other channels. */
  body: string;
  payload?: Record<string, unknown> | null;
  /** Defer delivery until this time. Defaults to now (send on next drain). */
  scheduledFor?: Date;
}

export async function queueNotification(input: QueueNotificationInput): Promise<Notification> {
  return prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      bookingId: input.bookingId ?? null,
      channel: input.channel ?? 'EMAIL',
      type: input.type,
      to: input.to,
      subject: input.subject ?? null,
      body: input.body,
      payload: (input.payload ?? undefined) as never,
      scheduledFor: input.scheduledFor ?? new Date(),
    },
  });
}

export interface SendPendingResult {
  considered: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendPendingNotifications(
  { limit = 50 }: { limit?: number } = {},
): Promise<SendPendingResult> {
  const due = await prisma.notification.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: new Date() },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const n of due) {
    if (n.channel !== 'EMAIL') {
      // SMS / WHATSAPP transports arrive with TASK-09. Leave the row PENDING
      // so it ships automatically once the dispatcher is wired up.
      skipped++;
      continue;
    }
    const result = await dispatchEmail(n);
    if (result.ok) {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attempts: n.attempts + 1,
          providerId: result.providerId ?? null,
          lastError: null,
        },
      });
      sent++;
    } else {
      const attempts = n.attempts + 1;
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          attempts,
          lastError: result.error ?? null,
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        },
      });
      failed++;
    }
  }

  return { considered: due.length, sent, failed, skipped };
}

interface DispatchResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

async function dispatchEmail(n: Notification): Promise<DispatchResult> {
  const client = getResend();
  if (!client) return { ok: false, error: 'no_api_key' };
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return { ok: false, error: 'no_from_email' };

  try {
    const result = await client.emails.send({
      from: `${FROM_NAME} <${from}>`,
      to: n.to,
      subject: n.subject ?? '(no subject)',
      html: n.body,
    });
    const errBody = (result as { error?: unknown })?.error;
    if (errBody) {
      const msg =
        errBody && typeof errBody === 'object' && 'message' in errBody
          ? String((errBody as { message: unknown }).message)
          : String(errBody);
      return { ok: false, error: msg };
    }
    const id = (result as { data?: { id?: string } })?.data?.id;
    return { ok: true, providerId: id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
