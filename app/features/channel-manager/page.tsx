import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Two-Way Channel Manager for Guesthouses & Boutique Hotels | Vayves',
  description:
    'Two-way OTA sync for Maldives guesthouses and boutique hotels: keep Booking.com, Agoda and more aligned with one calendar. Stop double-bookings and sell direct too.',
  alternates: { canonical: 'https://vayves.com/features/channel-manager' },
};

export default function ChannelManagerFeaturePage() {
  return (
    <MarketingLanding
      path="/features/channel-manager"
      metaDescription={metadata.description as string}
      badge="Feature · Channel manager"
      h1="Two-way OTA sync for guesthouses and boutique hotels"
      wedge="One calendar drives every channel. Vayves pushes rates and availability out to your OTAs and pulls bookings back in, so the same room is never sold twice — built for small Maldives properties."
      ctaLabel="Sign up free"
      secondaryCta={{ label: 'Book a demo', href: '/for-guesthouses' }}
      intro="Boutique hotels and island guesthouses usually sell on more than one OTA. Without a channel manager, a Booking.com reservation can leave Agoda still open for the same night. Vayves keeps connected channels in step and gives you a direct-booking website alongside them."
      sections={[
        {
          h2: 'What two-way sync means in practice',
          bullets: [
            'Outbound — rates and availability you set in Vayves update connected OTAs.',
            'Inbound — OTA bookings appear on your Vayves calendar and close inventory elsewhere.',
            'One source of truth — stop editing the same night in three extranets.',
            'Direct channel — guests can still book on your own vayves.com site without an OTA middleman.',
          ],
        },
        {
          h2: 'Built for guesthouses and boutique hotels',
          paragraphs: [
            'Large hotel chains buy enterprise channel managers. Small properties need the same protection against overbooking without a heavy IT project. Vayves pairs channel sync with island-ready operations: guest folios, transfers, and MIRA-oriented tax lines from the same bookings.',
          ],
          bullets: [
            'Sized for properties that run from a phone or laptop at the front desk.',
            'Works alongside Maldives tax and transfer workflows in Vayves.',
            'No competitor lock-in pitch — just one calendar for your channels.',
          ],
        },
        {
          h2: 'How it fits your week',
          paragraphs: [
            'Update a weekend rate once. Close a room for maintenance once. When a guest books on Booking.com or Agoda, that night disappears from the other connected channels and shows on your arrivals list with the guest details you need for transfers and check-in.',
          ],
        },
      ]}
      faqs={[
        {
          q: 'Which OTAs can I sync?',
          a: 'Vayves connects Booking.com, Agoda and other channels through channel-manager and iCal-style sync so rates and availability stay aligned across the calendars you use.',
        },
        {
          q: 'Is sync really two-way?',
          a: 'Yes in the operational sense: you publish inventory and rates from Vayves, and OTA bookings flow back into Vayves and adjust availability on other connected channels so you do not double-sell a room.',
        },
        {
          q: 'Will this stop double-bookings?',
          a: 'When a night is sold on a connected channel, Vayves closes that inventory on the others. That is the main reason small hotels adopt a channel manager.',
        },
        {
          q: 'Do I still need a direct booking page?',
          a: 'You should. OTAs bring demand; your own site keeps more of the margin. Every Vayves property gets a direct-booking website on a subdomain you control.',
        },
        {
          q: 'Is this only for Maldives properties?',
          a: 'Vayves is built around Maldives guesthouse and boutique-hotel operations (transfers, local payments, MIRA tax lines), but the channel-manager idea — one calendar, many OTAs — is the same workflow small hotels use worldwide.',
        },
      ]}
      related={[
        { label: 'Maldives guesthouse solution', href: '/solutions/maldives-guesthouses' },
        { label: 'Channel manager overview', href: '/channel-manager' },
        { label: 'Direct booking', href: '/direct-booking' },
        { label: 'Start free', href: '/claim' },
      ]}
    />
  );
}
