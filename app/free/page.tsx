import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Free Hotel & Guesthouse Management Software | Vayves',
  description:
    'Start free with Vayves: a direct-booking website, an amaldives.com listing and pay-at-property — no card, no commission. Upgrade for channel sync and the tax module when you grow.',
  alternates: { canonical: 'https://vayves.com/free' },
};

export default function FreePage() {
  return (
    <MarketingLanding
      path="/free"
      metaDescription={metadata.description as string}
      badge="Free to start"
      h1="Free hotel & guesthouse management software"
      wedge="Get a real direct-booking website, an amaldives.com listing and pay-at-property on the free plan — no card, no setup fee, no commission on direct bookings. Upgrade only when you need channel sync."
      ctaLabel="Start free — no card"
      intro="Most 'free' hotel software is a stripped trial that stops working after 14 days. Vayves has a genuinely free plan built for small properties getting started: your own booking page, a listing on amaldives.com and manual reservations — enough to take direct bookings today and keep 100% of the room rate."
      sections={[
        {
          h2: 'What you get for free',
          bullets: [
            'Your own direct-booking website on a {name}.vayves.com address.',
            'A listing on amaldives.com — real traveller demand, direct bookings at a 4% platform fee.',
            'Reservations, availability calendar and a guest portal.',
            'Pay-at-property, or connect Stripe/BML/Maya when you are ready.',
            'No card required, no time limit, no commission on your own direct bookings.',
          ],
        },
        {
          h2: 'When to upgrade',
          paragraphs: [
            'The free plan is perfect for a single small property taking direct bookings. You upgrade when you want to automate more:',
          ],
          bullets: [
            'Growth ($19/mo): channel manager (Booking.com, Agoda, Airbnb) + SMS notifications.',
            'Business ($49/mo): API access, multi-property, and the full MIRA tax module.',
            'Channel Plus ($79/mo): priority channel sync and Stripe direct payouts.',
          ],
        },
        {
          h2: 'Why free actually works here',
          paragraphs: [
            'Vayves can offer a real free plan because the business is aligned with yours: when amaldives.com sends you a booking, the platform earns a small 4% fee — far below the 15–18% OTAs take. You get the software free and keep the OTA margin; the platform grows only when you take bookings. No trap, no bait-and-switch.',
          ],
        },
      ]}
      pricing={[
        { tier: 'Free', price: '$0', blurb: 'Booking website + amaldives listing + pay-at-property. Forever.' },
        { tier: 'Growth', price: '$19/mo', blurb: 'Channel sync + SMS.' },
        { tier: 'Business', price: '$49/mo', blurb: 'API + multi-property + tax module.' },
        { tier: 'Channel Plus', price: '$79/mo', blurb: 'Priority sync + Stripe payouts.' },
      ]}
      faqs={[
        { q: 'Is the free plan really free?', a: 'Yes — no card, no time limit. You get a booking website, an amaldives.com listing and reservations. There is no commission on your own direct bookings; amaldives.com-sourced bookings carry a 4% platform fee.' },
        { q: 'What is the catch?', a: 'There is none on the free plan. You upgrade only if you want channel sync to OTAs, multi-property, the tax module or automated payouts.' },
        { q: 'Do I need a credit card to start?', a: 'No. You can claim your account and take bookings without entering any payment details.' },
        { q: 'Can I take payments on the free plan?', a: 'Yes — pay-at-property is included, and you can connect Stripe, BML Connect or Maya whenever you want online payments.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'Little Hotelier alternative', href: '/little-hotelier-alternative' },
        { label: 'Channel manager', href: '/channel-manager' },
        { label: 'Zero-commission direct booking', href: '/direct-booking' },
      ]}
    />
  );
}
