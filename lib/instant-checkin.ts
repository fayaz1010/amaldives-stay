import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import {
  getCheckInOutConfig,
  checkInQrPayload,
  checkoutQrPayload,
  type CheckInOutConfig,
} from '@/lib/checkin-out-config';

export type { CheckInOutConfig };
export { getCheckInOutConfig, checkInQrPayload, checkoutQrPayload };

function randomCode(len = 8): string {
  return randomBytes(len).toString('base64url').slice(0, len).toUpperCase();
}

export async function ensureCheckInCodes(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, checkInCode: true, checkoutCode: true },
  });
  if (!booking) throw new Error('Booking not found');

  const checkInCode = booking.checkInCode ?? `CI-${randomCode(6)}`;
  const checkoutCode = booking.checkoutCode ?? `CO-${randomCode(6)}`;

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      checkInCode: booking.checkInCode ?? checkInCode,
      checkoutCode: booking.checkoutCode ?? checkoutCode,
    },
    select: { id: true, checkInCode: true, checkoutCode: true, guestToken: true },
  });
}
