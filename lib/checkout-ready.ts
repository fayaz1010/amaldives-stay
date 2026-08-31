import { prisma } from '@/lib/db';
import { getCheckInOutConfig } from '@/lib/checkin-out-config';
import { queueNotification } from '@/lib/notifications';
import { tenantUrl } from '@/lib/domain';

const DEFAULT_CHECKOUT_HOUR = 11;

/** When checkout folio should become available (hours before property checkout time). */
export function computeCheckoutReadyMoment(
  checkOutDate: Date,
  hoursBefore: number,
  checkoutHour = DEFAULT_CHECKOUT_HOUR,
): Date {
  const checkoutAt = new Date(checkOutDate);
  checkoutAt.setHours(checkoutHour, 0, 0, 0);
  return new Date(checkoutAt.getTime() - hoursBefore * 60 * 60 * 1000);
}

export async function markCheckoutReadyForTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, subdomain: true, settings: true, name: true },
  });
  if (!tenant) return { marked: 0 };

  const config = getCheckInOutConfig(tenant.settings);
  const hoursBefore = config.checkoutHoursBeforeDeparture ?? 4;
  const now = new Date();

  const candidates = await prisma.booking.findMany({
    where: {
      tenantId,
      status: 'CHECKED_IN',
      checkoutReadyAt: null,
      checkOutDate: { lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
    },
    include: {
      guest: { select: { email: true, name: true } },
      room: { select: { number: true, name: true } },
    },
  });

  let marked = 0;
  for (const booking of candidates) {
    const readyMoment = computeCheckoutReadyMoment(booking.checkOutDate, hoursBefore);
    if (now < readyMoment) continue;

    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkoutReadyAt: now },
    });
    marked += 1;

    if (booking.guest.email && booking.checkoutCode) {
      const guestUrl = tenantUrl(tenant.subdomain, `/guest/${booking.guestToken}`);
      await queueNotification({
        tenantId,
        bookingId: booking.id,
        type: 'CHECKOUT_READY',
        to: booking.guest.email,
        subject: `Checkout ready — ${tenant.name}`,
        body: `<p>Your bill is ready. Show checkout code <strong>${booking.checkoutCode}</strong> at the desk or pay in your guest portal.</p><p><a href="${guestUrl}">Open guest portal</a></p>`,
      }).catch(() => {});
    }
  }

  return { marked };
}
