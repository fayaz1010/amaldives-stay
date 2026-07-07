import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Cloudbeds Alternative for Small Hotels & Guesthouses | Vayves',
  description:
    'A simpler, cheaper Cloudbeds alternative for small and independent properties: PMS + channel manager + direct booking, from $19/mo with a free plan — plus commission-free demand and Maldives tax handling.',
  alternates: { canonical: 'https://vayves.com/vs-cloudbeds' },
};

export default function VsCloudbedsPage() {
  return (
    <MarketingLanding
      path="/vs-cloudbeds"
      metaDescription={metadata.description as string}
      badge="Comparison"
      h1="A Cloudbeds alternative built for small properties"
      wedge="Cloudbeds is powerful — and priced and built for bigger properties. If you run a guesthouse or boutique hotel, Vayves gives you the essentials — PMS, channel manager, direct booking — for a fraction of the cost, plus commission-free demand and a Maldives tax engine."
      ctaLabel="Start free — no card"
      intro="Cloudbeds is a capable all-in-one hospitality platform. But small and independent operators often find it more than they need and more than they want to pay. Vayves focuses on exactly what a property under ~50 rooms uses every day, keeps it simple, and adds a demand channel Cloudbeds does not have."
      sections={[
        {
          h2: 'Where Vayves fits better',
          bullets: [
            'Price — from $19/mo with a real free plan, versus Cloudbeds’ higher tiers aimed at larger properties.',
            'Simplicity — set up and run from your phone in a day, not a rollout project.',
            'Demand included — list on amaldives.com and take direct bookings at 4%, not just software to manage them.',
            'Maldives-native — TGST, Green Tax and MIRA handled automatically; BML and Maya payments built in.',
          ],
        },
      ]}
      table={{
        caption: 'Vayves vs Cloudbeds for a small property',
        headers: ['Feature', 'Vayves', 'Cloudbeds'],
        rows: [
          { label: 'Best for', cells: ['Guesthouses & small/boutique hotels', 'Mid-size to larger hotels & hostels'] },
          { label: 'Starting price', cells: ['$19/mo (free plan available)', 'Higher; scales with rooms'] },
          { label: 'Free plan', cells: ['Yes', 'No'] },
          { label: 'Channel manager', cells: ['Yes', 'Yes'] },
          { label: 'Direct-booking site', cells: ['Yes', 'Yes'] },
          { label: 'Built-in demand channel', cells: ['Yes — amaldives.com at 4%', 'No'] },
          { label: 'Maldives tax (TGST / Green Tax / MIRA)', cells: ['Yes', 'No'] },
          { label: 'Local payments (BML, Maya)', cells: ['Yes', 'No'] },
        ],
      }}
      faqs={[
        { q: 'Is Vayves cheaper than Cloudbeds?', a: 'For small properties, yes — Vayves starts at $19/mo with a free plan, while Cloudbeds is priced for larger operations. Most guesthouses and boutique hotels pay significantly less.' },
        { q: 'Does Vayves do everything Cloudbeds does?', a: 'For a small property’s daily needs — reservations, channel manager, direct booking, payments, housekeeping — yes. Cloudbeds has deeper enterprise and revenue-management modules that large hotels may need; Vayves focuses on the essentials plus a demand channel.' },
        { q: 'Can I move from Cloudbeds to Vayves?', a: 'Yes. You can rebuild your rooms, rates and channel connections in Vayves and switch over; the team can help you migrate.' },
      ]}
      related={[
        { label: 'Little Hotelier alternative', href: '/little-hotelier-alternative' },
        { label: 'PMS for small hotels', href: '/small-hotels' },
        { label: 'Free hotel PMS', href: '/free' },
        { label: 'Maldives hotel management software', href: '/maldives' },
      ]}
    />
  );
}
