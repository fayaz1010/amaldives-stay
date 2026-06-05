import { bookingConfirmationHtml } from '@/lib/email-templates';
import { getResend } from '@/lib/email';

export async function sendBookingConfirmationEmail(args: {
  to: string;
  guestName: string;
  tenantName: string;
  confirmationNumber: string;
  checkIn: Date;
  checkOut: Date;
  roomName: string;
  totalAmount: number;
  currency: string;
  propertyPhone?: string;
  propertyEmail?: string;
}) {
  const client = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) return { sent: false };

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const nights = Math.max(
    1,
    Math.ceil((args.checkOut.getTime() - args.checkIn.getTime()) / 86400000)
  );

  await client.emails.send({
    from: `amaldives STAY <${from}>`,
    to: args.to,
    subject: `Booking confirmed — ${args.confirmationNumber}`,
    html: bookingConfirmationHtml({
      guestName: args.guestName,
      confirmationNumber: args.confirmationNumber,
      propertyName: args.tenantName,
      checkIn: fmt(args.checkIn),
      checkOut: fmt(args.checkOut),
      roomName: args.roomName,
      roomNumber: '',
      nights,
      totalAmount: args.totalAmount,
      currency: args.currency,
      propertyPhone: args.propertyPhone ?? '',
      propertyEmail: args.propertyEmail ?? '',
    }),
  });

  return { sent: true };
}
