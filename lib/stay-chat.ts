import { prisma } from '@/lib/db';
import type { Booking, ChatSenderRole } from '@prisma/client';

/** Start of local calendar day in UTC (Maldives ops use Indian/Maldives tz in UI; gate by date fields). */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Days after departure that admin↔guest chat stays open for post-stay follow-up. */
const POST_STAY_GRACE_DAYS = 3;

/**
 * Chat is available from booking creation (pre-arrival) through a few days
 * after departure, so owners can coordinate with the guest before check-in and
 * follow up shortly after check-out. Only hard-blocked for cancelled/no-show
 * bookings.
 */
export function canAccessStayChat(
  booking: Pick<Booking, 'checkInDate' | 'checkOutDate' | 'status'>,
  now = new Date(),
): boolean {
  if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') return false;
  const today = startOfDay(now);
  const lastDay = addDays(startOfDay(booking.checkOutDate), POST_STAY_GRACE_DAYS);
  if (today > lastDay) return false;
  return true;
}

export function chatWindowLabel(
  booking: Pick<Booking, 'checkInDate' | 'checkOutDate'>,
): string {
  const inStr = booking.checkInDate.toISOString().slice(0, 10);
  const outStr = booking.checkOutDate.toISOString().slice(0, 10);
  return `${inStr} → ${outStr}`;
}

export async function ensureStayConversation(bookingId: string, tenantId: string) {
  const existing = await prisma.stayConversation.findUnique({ where: { bookingId } });
  if (existing) return existing;
  return prisma.stayConversation.create({
    data: { tenantId, bookingId },
  });
}

export async function postStayMessage(input: {
  conversationId: string;
  senderRole: ChatSenderRole;
  senderUserId?: string | null;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error('Message body is required');
  return prisma.stayMessage.create({
    data: {
      conversationId: input.conversationId,
      senderRole: input.senderRole,
      senderUserId: input.senderUserId ?? null,
      body,
    },
  });
}
