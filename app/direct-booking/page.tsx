import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Zero-Commission Direct Booking Website for Hotels | Vayves',
  description:
    'Take commission-free direct bookings with a Vayves booking website — plus demand from amaldives.com at just 4% vs 15–18% OTA commission. Own your guest relationship. From $19/mo.',
  alternates: { canonical: 'https://vayves.com/direct-booking' },
};

export default function DirectBookingPage() {
  return (
    <MarketingLanding
      path="/direct-booking"
      metaDescription={metadata.description as string}
      badge="Direct booking"
      h1="A zero-commission direct-booking engine for your property"
      wedge="Stop giving 15–18% to OTAs on every stay. Vayves gives you a fast direct-booking website with no commission — and demand from amaldives.com at just 4% — so more of every booking stays with you."
      intro="OTAs are great for discovery and terrible for margin. Every booking they send costs you 15–18% forever. A direct-booking engine lets guests book on your own site — and you keep the commission. Vayves makes that direct channel real, and adds a demand source so 'direct' does not have to mean 'empty'."
      sections={[
        {
          h2: 'How Vayves grows your direct bookings',
          bullets: [
            'Your own booking website — real-time availability and rates on a {name}.vayves.com address or your own domain.',
            'One-line embed — add a "Book direct" button to your Facebook page, Instagram bio or existing site.',
            'Commission-free — you pay nothing on bookings that come through your own page.',
            'amaldives.com demand — list your property and take direct bookings at a 4% platform fee instead of OTA rates.',
            'Own the guest — you get the email, the relationship and the repeat booking, not the OTA.',
          ],
        },
        {
          h2: 'The commission maths',
          paragraphs: [
            'On a $120/night, 3-night stay, an 18% OTA commission is about $65 gone. Through your Vayves direct site that is $0; through amaldives.com the 4% fee is under $15. Shift even a third of your bookings direct and the difference dwarfs the subscription — which is why the software effectively pays for itself.',
          ],
        },
        {
          h2: 'Payments that fit your market',
          paragraphs: [
            'Take cards via Stripe, local gateways like BML Connect and Maya, or pay-at-property — so guests can always pay the way they prefer, and you get paid on your terms.',
          ],
        },
      ]}
      faqs={[
        { q: 'What does "zero-commission" mean exactly?', a: 'Bookings made through your own Vayves booking website carry no platform commission. Bookings sourced from the amaldives.com marketplace carry a 4% fee — still far below the 15–18% OTAs charge.' },
        { q: 'Can I add a booking button to my existing website or social?', a: 'Yes — Vayves gives you a one-line embed and a shareable booking link you can put on Facebook, Instagram or any website.' },
        { q: 'How do I actually get direct bookings, not just a booking page?', a: 'Vayves pairs the booking engine with demand: your property lists on amaldives.com, which sends real traveller bookings straight to your calendar at 4%.' },
        { q: 'What payment methods are supported?', a: 'Cards via Stripe, BML Connect, Maya and pay-at-property, in USD or MVR.' },
      ]}
      related={[
        { label: 'Channel manager', href: '/channel-manager' },
        { label: 'Free hotel PMS', href: '/free' },
        { label: 'Local payments (BML, Maya)', href: '/payments-maldives' },
        { label: 'Maldives hotel management software', href: '/maldives' },
      ]}
    />
  );
}
