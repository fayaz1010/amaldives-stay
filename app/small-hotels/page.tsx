import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'PMS for Small Hotels, Guesthouses & Independent Properties | Vayves',
  description:
    'Vayves is a property management system for small and independent hotels: reservations, channel manager, direct-booking site and payments — from $19/mo, with a free plan. Built for properties under 50 rooms.',
  alternates: { canonical: 'https://vayves.com/small-hotels' },
};

export default function SmallHotelsPage() {
  return (
    <MarketingLanding
      path="/small-hotels"
      metaDescription={metadata.description as string}
      badge="For small & independent hotels"
      h1="A PMS built for small hotels and guesthouses"
      wedge="Enterprise hotel software is overkill for a 10–40 room property. Vayves gives independent hotels and guesthouses exactly what they need — reservations, channel sync, a booking website and payments — from $19/mo, with a genuinely free plan."
      intro="Big PMS platforms are priced and designed for chains. Small properties end up paying for modules they never use and fighting an interface built for a 300-room resort. Vayves is the opposite: simple enough to run from your phone, complete enough to replace your spreadsheet, OTA extranets and separate booking widget."
      sections={[
        {
          h2: 'What independent properties actually need',
          bullets: [
            'One reservation calendar — availability, group bookings, check-in/out, no-shows.',
            'Channel manager — Booking.com, Agoda, Airbnb kept in sync so you never double-book.',
            'A direct-booking website — take commission-free bookings on your own page.',
            'Payments — cards, local gateways, or pay-at-property.',
            'Housekeeping, staff and expenses — the daily operations, not just the bookings.',
          ],
        },
        {
          h2: 'Priced for small properties',
          paragraphs: [
            'Start free with a booking website and reservations. Add channel sync at $19/mo, multi-property and reporting at $49/mo. No per-room enterprise pricing, no annual lock-in, no setup fee.',
          ],
        },
        {
          h2: 'Demand, not just software',
          paragraphs: [
            'Unlike a plain PMS, Vayves includes a way to get booked: your property can list on amaldives.com and take direct bookings at a 4% platform fee — far below OTA commission — so the system helps fill rooms, not just track them.',
          ],
        },
      ]}
      faqs={[
        { q: 'Is Vayves good for a property under 20 rooms?', a: 'Yes — it is designed for small and independent properties. The free plan and $19/mo tier are built exactly for guesthouses and boutique hotels under 50 rooms.' },
        { q: 'Do I need technical skills to set it up?', a: 'No. You can claim your account, add rooms and rates, and take your first booking the same day. It runs from your phone.' },
        { q: 'Can it replace my OTA extranets and booking widget?', a: 'Yes — the channel manager syncs your OTAs and the built-in booking website replaces a separate widget, so everything lives in one place.' },
      ]}
      related={[
        { label: 'Little Hotelier alternative', href: '/little-hotelier-alternative' },
        { label: 'Cloudbeds alternative', href: '/vs-cloudbeds' },
        { label: 'Free hotel PMS', href: '/free' },
        { label: 'Maldives hotel management software', href: '/maldives' },
      ]}
    />
  );
}
