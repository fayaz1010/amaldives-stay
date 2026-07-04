import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ingestOtaEmailBooking, type IngestResult } from '@/lib/ota-email-ingest';
import { reconcileStoredExtraction } from '@/lib/ota-email-verify';
import type { ParsedOtaEmail, OtaEmailAction, OtaSource } from '@/lib/ota-email-parse';
import type { OtaMessageStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];

const OverridesSchema = z.object({
  source: z.enum(['booking.com', 'airbnb', 'agoda', 'expedia', 'vrbo', 'ota']).optional(),
  action: z.enum(['new', 'modified', 'cancelled']).optional(),
  otaRef: z.string().trim().min(1).optional(),
  guestName: z.string().trim().max(200).nullable().optional(),
  guestEmail: z.string().trim().email().nullable().optional().or(z.literal('').transform(() => null)),
  guestPhone: z.string().trim().max(40).nullable().optional(),
  checkIn: z.string().trim().min(1).optional(),
  checkOut: z.string().trim().min(1).optional(),
  roomHint: z.string().trim().max(200).nullable().optional(),
  adults: z.number().int().positive().max(20).optional(),
  children: z.number().int().nonnegative().max(20).optional(),
  amount: z.number().nonnegative().optional(),
});

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), overrides: OverridesSchema.optional() }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().max(500).optional() }),
]);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const message = await prisma.otaEmailMessage.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (message.status !== 'NEEDS_REVIEW' && message.status !== 'FAILED') {
    return NextResponse.json({ error: `Message already resolved (${message.status})` }, { status: 409 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
  }

  const reviewedBy = session.user.email || session.user.id || 'admin';

  if (parsed.data.action === 'reject') {
    const updated = await prisma.otaEmailMessage.update({
      where: { id: message.id },
      data: { status: 'REJECTED', reviewedBy, reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true, message: updated });
  }

  // Approve — build the final reservation struct from the AI/regex
  // suggestion, then let the admin's overrides win field-by-field.
  const suggestion = reconcileStoredExtraction(message.regexResult, message.aiResult).final;
  const o = parsed.data.overrides ?? {};
  const source: OtaSource = (o.source ?? suggestion?.source ?? (message.source as OtaSource) ?? 'ota');
  const action: OtaEmailAction = (o.action ?? suggestion?.action ?? 'new');
  const otaRef = o.otaRef ?? suggestion?.otaRef ?? '';
  const checkIn = o.checkIn ? new Date(o.checkIn) : suggestion?.checkIn ?? null;
  const checkOut = o.checkOut ? new Date(o.checkOut) : suggestion?.checkOut ?? null;

  if (!otaRef) {
    return NextResponse.json({ error: 'otaRef is required to approve this booking' }, { status: 400 });
  }
  if (action !== 'cancelled' && (!checkIn || !checkOut || isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn)) {
    return NextResponse.json({ error: 'A valid check-in/check-out date range is required to approve this booking' }, { status: 400 });
  }

  const final: ParsedOtaEmail = {
    source,
    action,
    otaRef,
    guestName: o.guestName !== undefined ? o.guestName : suggestion?.guestName ?? null,
    guestEmail: o.guestEmail !== undefined ? o.guestEmail : suggestion?.guestEmail ?? null,
    guestPhone: o.guestPhone !== undefined ? o.guestPhone : suggestion?.guestPhone ?? null,
    checkIn,
    checkOut,
    roomHint: o.roomHint !== undefined ? o.roomHint : suggestion?.roomHint ?? null,
    adults: o.adults ?? suggestion?.adults ?? null,
    children: o.children ?? suggestion?.children ?? null,
    amount: o.amount ?? suggestion?.amount ?? null,
  };

  let ingestResult: IngestResult;
  try {
    ingestResult = await ingestOtaEmailBooking(session.user.tenantId, final);
  } catch (err) {
    return NextResponse.json(
      { error: `Approval failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  if (ingestResult.status === 'skipped') {
    return NextResponse.json({ error: `Could not create booking: ${ingestResult.reason}` }, { status: 422 });
  }

  const statusMap: Record<Exclude<IngestResult['status'], 'skipped'>, OtaMessageStatus> = {
    created: 'CREATED',
    updated: 'UPDATED',
    cancelled: 'CANCELLED',
  };

  const updated = await prisma.otaEmailMessage.update({
    where: { id: message.id },
    data: {
      status: statusMap[ingestResult.status],
      bookingId: ingestResult.bookingId ?? null,
      reviewedBy,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, message: updated, ingestResult });
}
