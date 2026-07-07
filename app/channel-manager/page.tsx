import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Channel Manager for Maldives Hotels & Guesthouses | Vayves',
  description:
    'Sync rates and availability across Booking.com, Agoda, Airbnb and more with the Vayves channel manager. No double-bookings, one calendar, built for Maldives properties. From $19/mo.',
  alternates: { canonical: 'https://vayves.com/channel-manager' },
};

export default function ChannelManagerPage() {
  return (
    <MarketingLanding
      path="/channel-manager"
      metaDescription={metadata.description as string}
      badge="Channel manager"
      h1="Channel manager for Maldives hotels & guesthouses"
      wedge="One calendar for every OTA. Vayves syncs your rates and availability across Booking.com, Agoda, Airbnb and more — so the same room is never sold twice — and adds a commission-free direct channel through amaldives.com."
      intro="If you sell rooms on more than one OTA, you have felt the pain: a guest books on Booking.com, you forget to close the room on Agoda, and now you are overbooked on a fully-booked island. A channel manager keeps every calendar in sync automatically. Vayves does that, and pairs it with a direct-booking website and amaldives.com demand so you are not paying commission on every stay."
      sections={[
        {
          h2: 'How the Vayves channel manager works',
          bullets: [
            'Connect your OTAs — Booking.com, Agoda, Airbnb and other channels via iCal and channel-manager sync.',
            'One source of truth — set rates and availability once in Vayves; every channel updates.',
            'No double-bookings — when a room sells anywhere, it closes everywhere, automatically.',
            'Direct channel included — your own booking website plus an amaldives.com listing that books direct at 4%.',
          ],
        },
        {
          h2: 'Why pair a channel manager with a direct channel',
          paragraphs: [
            'OTAs bring volume but take 15–18% commission. A channel manager stops the overbooking risk, but it does not lower your commission bill. Vayves does both: it keeps your OTAs in sync and gives you a commission-free way to take direct bookings — from your own site and from amaldives.com — so more of every booking stays with you.',
          ],
        },
        {
          h2: 'Built for island operations',
          paragraphs: [
            'Beyond channels, Vayves handles the rest of running a Maldives property: MIRA-ready TGST and Green Tax, BML/Maya payments, transfers and housekeeping — all in one system you can run from your phone.',
          ],
        },
      ]}
      faqs={[
        { q: 'Which OTAs does Vayves connect to?', a: 'Booking.com, Agoda, Airbnb and other channels via channel-manager and iCal sync, keeping rates and availability aligned across all of them.' },
        { q: 'Will it stop double-bookings?', a: 'Yes. When a room is booked on any connected channel, Vayves closes that room across the others automatically, so you cannot oversell.' },
        { q: 'How often does it sync?', a: 'Availability syncs on a short poll (about every few minutes) so your channels stay current without manual updates.' },
        { q: 'Does it include a direct-booking option?', a: 'Yes — every plan includes your own direct-booking website, and your property can list on amaldives.com to take direct bookings at a 4% platform fee instead of OTA commission.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'Zero-commission direct booking', href: '/direct-booking' },
        { label: 'MIRA tax module', href: '/mira-tax' },
        { label: 'Free hotel PMS', href: '/free' },
      ]}
    />
  );
}
