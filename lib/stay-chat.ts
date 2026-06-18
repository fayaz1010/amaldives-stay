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

/**
 * Chat is available from check-in date through departure day (inclusive).
 */
export function canAccessStayChat(
  booking: Pick<Booking, 'checkInDate' | 'checkOutDate' | 'status'>,
  now = new Date(),
): boolean {
  if (booking.status === 'CANCELLED') return false;
  const today = startOfDay(now);
  const checkIn = startOfDay(booking.checkInDate);
  const lastDay = startOfDay(booking.checkOutDate); // departure day inclusive
  if (today < checkIn) return false;
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
