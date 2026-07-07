import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'The Little Hotelier Alternative for Small Hotels & Guesthouses | Vayves',
  description:
    'Looking for a Little Hotelier or eviivo alternative? Vayves gives small hotels and guesthouses the same PMS + channel manager + booking site — plus commission-free demand and a Maldives tax engine. From $19/mo.',
  alternates: { canonical: 'https://vayves.com/little-hotelier-alternative' },
};

export default function LittleHotelierAlternativePage() {
  return (
    <MarketingLanding
      path="/little-hotelier-alternative"
      metaDescription={metadata.description as string}
      badge="Comparison"
      h1="The Little Hotelier alternative for small hotels & guesthouses"
      wedge="Everything Little Hotelier and eviivo do for properties under 50 rooms — PMS, channel manager, direct-booking site — plus commission-free demand from amaldives.com and a built-in Maldives tax engine. From $19/mo."
      ctaLabel="Start free — no card"
      intro="Little Hotelier and eviivo are solid all-in-one systems for small properties. But if you run a guesthouse or boutique hotel — especially in the Maldives — Vayves covers the same ground and adds two things neither offers: a demand channel that sends you direct bookings, and automatic TGST/Green Tax/MIRA handling. Here is an honest, side-by-side look."
      sections={[
        {
          h2: 'Who each one is for',
          bullets: [
            'Little Hotelier — small hotels, B&Bs and guesthouses worldwide; strong channel manager, part of the SiteMinder group.',
            'eviivo — independent and boutique properties, mostly UK/US/EU; friendly interface, good for B&Bs.',
            'Vayves — small hotels, guesthouses and resorts, built around a demand channel (amaldives.com) and localised operations (Maldives tax, BML/Maya payments, transfers).',
          ],
        },
      ]}
      table={{
        caption: 'Vayves vs Little Hotelier vs eviivo',
        headers: ['Feature', 'Vayves', 'Little Hotelier', 'eviivo'],
        rows: [
          { label: 'Starting price', cells: ['$19/mo (free plan available)', 'Higher monthly, varies by rooms', 'Higher monthly, varies by rooms'] },
          { label: 'Free plan', cells: ['Yes — booking site + listing', 'No', 'No'] },
          { label: 'Channel manager (Booking/Agoda/Airbnb)', cells: ['Yes', 'Yes', 'Yes'] },
          { label: 'Direct-booking website', cells: ['Yes', 'Yes', 'Yes'] },
          { label: 'Built-in demand channel', cells: ['Yes — amaldives.com bookings at 4%', 'No', 'No'] },
          { label: 'Maldives tax engine (TGST / Green Tax / MIRA)', cells: ['Yes', 'No', 'No'] },
          { label: 'Local payments (BML, Maya)', cells: ['Yes', 'No', 'No'] },
          { label: 'Transfers (speedboat / seaplane / ferry)', cells: ['Yes', 'No', 'No'] },
        ],
      }}
      faqs={[
        { q: 'Is Vayves cheaper than Little Hotelier?', a: 'Vayves starts at $19/mo and has a genuinely free plan, so most small properties pay less — and the amaldives.com channel can cover the cost with a single direct booking.' },
        { q: 'Can I migrate from Little Hotelier or eviivo?', a: 'Yes. You can set up your rooms, rates and channel connections in Vayves and switch over. Reach out and the team will help you move your inventory.' },
        { q: 'When should I pick Vayves over Little Hotelier?', a: 'If you want commission-free demand as well as software, or you operate in the Maldives and need TGST/Green Tax/MIRA handled automatically, Vayves is the stronger fit. For a generic small hotel outside the Maldives, both work — Vayves adds the free tier and the direct-booking channel.' },
        { q: 'Does Vayves have a channel manager like Little Hotelier?', a: 'Yes — it syncs rates and availability across Booking.com, Agoda, Airbnb and other OTAs so you never double-book.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'PMS for small hotels', href: '/small-hotels' },
        { label: 'Cloudbeds alternative', href: '/vs-cloudbeds' },
        { label: 'Free hotel PMS', href: '/free' },
      ]}
    />
  );
}
