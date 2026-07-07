import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Hotel & Guesthouse Management Software for the Maldives | Vayves',
  description:
    'Vayves is hotel management software built for Maldives properties: reservations, channel manager, MIRA-ready TGST & Green Tax, BML/Maya payments and commission-free bookings from amaldives.com. From $19/mo.',
  alternates: { canonical: 'https://vayves.com/maldives' },
};

export default function MaldivesPage() {
  return (
    <MarketingLanding
      path="/maldives"
      metaTitle={metadata.title as string}
      metaDescription={metadata.description as string}
      badge="Built for the Maldives"
      h1="Hotel & guesthouse management software built for the Maldives"
      wedge="Run your island property end-to-end — reservations, channel sync, MIRA-ready tax and local payments — and get commission-free bookings from amaldives.com. Not just software: real demand."
      intro="Most property management systems are foreign platforms adapted for the Maldives. Vayves is built around how island properties actually operate — MIRA tax filing, TGST and Green Tax per guest-night, BML Connect and Maya payments, speedboat and seaplane transfers — and it plugs straight into amaldives.com so travellers can book you direct, commission-free."
      sections={[
        {
          h2: 'Everything a Maldives property needs, in one place',
          bullets: [
            'Reservations & availability — one calendar across all your rooms, with group bookings and a no-show flow.',
            'Channel manager — sync rates and availability to Booking.com, Agoda and Airbnb so you never double-book.',
            'MIRA-ready tax — TGST (17%) and Green Tax computed per guest-night, ready for your monthly MIRA return.',
            'Local payments — BML Connect, Maya, cards (Stripe) or pay-at-property, in USD or MVR.',
            'Transfers & arrivals — speedboat, ferry and seaplane scheduling with guest confirmations.',
            'Your own booking website — a direct-booking page on a {name}.vayves.com address or your own domain.',
          ],
        },
        {
          h2: 'Commission-free demand from amaldives.com',
          paragraphs: [
            'Vayves is the only Maldives PMS with a built-in demand channel. When you go live, your property can be listed on amaldives.com — a traveller directory of 200+ resorts and 900+ guesthouses — and take direct bookings at a 4% platform fee instead of the 15–18% OTAs charge.',
            'That means the software pays for itself: a single direct booking a month usually covers the subscription, and every booking after that is margin you keep.',
          ],
        },
        {
          h2: 'Tax done the way MIRA expects',
          paragraphs: [
            'Maldivian properties have to handle TGST, Green Tax and MIRA 206 filing every month. Vayves computes it from your live bookings, per property, so you are never guessing at 28th-of-the-month deadlines.',
            'See the dedicated MIRA tax page for exactly how each tax is calculated and filed.',
          ],
          bullets: [
            'TGST 17% on tourism goods and services (since 1 July 2025).',
            'Green Tax USD 6/guest/night for guesthouses ≤50 rooms; USD 12 for >50 rooms and resorts (under-2s exempt).',
            'Per-property returns for multi-property owners — each with its own TIN.',
          ],
        },
        {
          h2: 'Made for island operations',
          paragraphs: [
            'Front desk, housekeeping, maintenance, staff clock-in and tasks, F&B and minibar, logistics and island supply, expenses and reports — all in one system you can run from your phone.',
            'Vayves runs live for real Maldives properties today, from single guesthouses to multi-property groups.',
          ],
        },
      ]}
      pricing={[
        { tier: 'Free', price: '$0', blurb: 'Direct-booking page + amaldives.com listing. Pay-at-property.' },
        { tier: 'Growth', price: '$19/mo', blurb: 'Channel sync (Booking/Agoda/Airbnb) + SMS notifications.' },
        { tier: 'Business', price: '$49/mo', blurb: 'API access + multi-property + full tax module.' },
        { tier: 'Channel Plus', price: '$79/mo', blurb: 'Priority sync + Stripe direct payouts.' },
      ]}
      faqs={[
        { q: 'Is Vayves MIRA-compliant?', a: 'Vayves computes TGST (17%) and Green Tax per guest-night from your live bookings and prepares the figures for your monthly MIRA return. You review and file; the software does the maths per property.' },
        { q: 'Does it connect to Booking.com and Agoda?', a: 'Yes. The channel manager syncs rates and availability across Booking.com, Agoda, Airbnb and other OTAs so the same room is never sold twice.' },
        { q: 'Can guests pay with BML or Maya?', a: 'Yes — Vayves supports BML Connect, Maya, cards via Stripe, and pay-at-property, in USD or MVR.' },
        { q: 'How is this different from Tharazoo, fahiHMS or eZee?', a: 'Vayves is the only Maldives PMS with a built-in demand channel: your property lists on amaldives.com and takes direct, commission-free bookings — so it drives revenue, not just operations.' },
        { q: 'How much does it cost?', a: 'There is a free plan (direct-booking page + amaldives listing). Paid plans run $19–79/mo depending on channel sync, multi-property and payment features.' },
      ]}
      related={[
        { label: 'MIRA tax — TGST, Green Tax & MIRA 206', href: '/mira-tax' },
        { label: 'Channel manager for Maldives', href: '/channel-manager' },
        { label: 'Free hotel PMS', href: '/free' },
        { label: 'Local payments (BML, Maya)', href: '/payments-maldives' },
        { label: 'For guesthouses', href: '/for-guesthouses' },
      ]}
    />
  );
}
