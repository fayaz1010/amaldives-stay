import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Accept BML, Maya & Card Payments for Your Maldives Property | Vayves',
  description:
    'Take booking payments with BML Connect, Maya, cards (Stripe) and pay-at-property — in USD or MVR — right inside Vayves. Built for Maldives guesthouses, hotels and resorts.',
  alternates: { canonical: 'https://vayves.com/payments-maldives' },
};

export default function PaymentsMaldivesPage() {
  return (
    <MarketingLanding
      path="/payments-maldives"
      metaDescription={metadata.description as string}
      badge="Local payments"
      h1="Accept BML, Maya & card payments — built for the Maldives"
      wedge="Guests pay the way they want — BML Connect, Maya, international cards or at check-in — in USD or MVR, right inside your booking flow. No bolted-on gateway, no lost bookings at checkout."
      intro="A booking is only real when the payment clears. Foreign PMS platforms often only support Stripe or PayPal, which many Maldivian guests and cards struggle with. Vayves supports the payment methods your market actually uses, so you stop losing bookings at the last step."
      sections={[
        {
          h2: 'Every way your guests pay',
          bullets: [
            'BML Connect — Bank of Maldives online payments for local and international cards.',
            'Maya — popular local wallet and card payments.',
            'International cards via Stripe — Visa, Mastercard, Apple Pay and Google Pay.',
            'Pay-at-property — take the booking now, collect on arrival.',
            'USD or MVR — price and charge in the currency that suits the booking.',
          ],
        },
        {
          h2: 'Payments tied to your bookings and tax',
          paragraphs: [
            'Because payments live inside Vayves, every transaction is linked to the booking, the guest and the tax figures. That means your TGST and Green Tax numbers, service-charge ledger and reports are always reconciled — no exporting and re-keying between a separate gateway and a spreadsheet.',
          ],
        },
      ]}
      faqs={[
        { q: 'Does Vayves support BML Connect?', a: 'Yes — you can connect BML Connect to take Bank of Maldives online card payments directly in your booking flow.' },
        { q: 'Can guests pay with Maya?', a: 'Yes. Maya is supported alongside BML, Stripe cards and pay-at-property.' },
        { q: 'Can I charge in USD and MVR?', a: 'Yes — you can price and collect in either currency depending on the booking.' },
        { q: 'Do I have to take payment online?', a: 'No — pay-at-property is fully supported, so you can confirm the booking now and collect on arrival if you prefer.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'MIRA tax module', href: '/mira-tax' },
        { label: 'Zero-commission direct booking', href: '/direct-booking' },
        { label: 'Channel manager', href: '/channel-manager' },
      ]}
    />
  );
}
