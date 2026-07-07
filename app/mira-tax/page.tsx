import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'MIRA-Ready Tax for Maldives Properties — TGST, Green Tax & MIRA 206 | Vayves',
  description:
    'Vayves auto-computes TGST (17%), Green Tax ($6/$12 per guest-night) and prepares your MIRA 206 return from live bookings — per property. Never miss a 28th-of-the-month deadline.',
  alternates: { canonical: 'https://vayves.com/mira-tax' },
};

export default function MiraTaxPage() {
  return (
    <MarketingLanding
      path="/mira-tax"
      metaDescription={metadata.description as string}
      badge="MIRA-ready"
      h1="TGST, Green Tax & MIRA 206 — computed automatically from your bookings"
      wedge="Your PMS should file your taxes. Vayves computes TGST, Green Tax and preps your MIRA return from live bookings, per property — so you are never fined for a late or wrong filing."
      intro="Every Maldives tourism establishment has to report to MIRA (Maldives Inland Revenue Authority) every month: TGST on tourism sales, Green Tax per guest-night, and the MIRA 206 return. Doing it by hand from a spreadsheet is where mistakes and late fees happen. Vayves already holds every booking, guest-night and payment — so it does the maths for you."
      sections={[
        {
          h2: 'What MIRA requires from a Maldives property',
          bullets: [
            'TGST (Tourism Goods & Services Tax) — 17% on tourism sales (rooms, F&B, excursions), since 1 July 2025. Filed monthly if taxable supply exceeds MVR 1M/period, otherwise quarterly, via MIRAconnect (due ~28th).',
            'Green Tax — USD 6 per guest, per night for guesthouses with 50 rooms or fewer on inhabited islands; USD 12 for properties over 50 rooms and resorts. Children under 2 are exempt. Paid in USD, monthly by the 28th.',
            'Service charge — 10% on tourism bills, distributed to staff (payroll, not a tax) — Vayves tracks it in the service-charge ledger.',
            'Business profit tax — 15% on annual profit above MVR 500,000 (filed annually).',
          ],
        },
        {
          h2: 'How Vayves automates each one',
          paragraphs: [
            'Because Vayves is your booking and payments system, it already knows every taxable night, guest count and revenue line. It applies the correct rates and tiers so your monthly numbers are ready to file.',
          ],
          bullets: [
            'TGST: computed on room, F&B and service revenue at 17% (output tax), with input-tax tracking, per period.',
            'Green Tax: guest-nights counted automatically, with the correct $6 or $12 tier by room count, under-2s excluded.',
            'MIRA 206: the figures assembled per property, ready to enter into MIRAconnect — with a due-date dashboard so nothing slips past the 28th.',
            'Multi-property: each property files its own return under its own TIN; Vayves keeps them separate.',
          ],
        },
        {
          h2: 'A worked example',
          paragraphs: [
            'A 12-room Maafushi guesthouse hosts 180 guest-nights in a month at an average room revenue of $45/night. Green Tax at the ≤50-room tier is 180 × $6 = $1,080. TGST at 17% on the room revenue is computed on the taxable supply for the period, net of allowable input tax. Vayves lays both out with the filing deadline, so the owner reviews and submits instead of rebuilding a spreadsheet every month.',
            'Rates and thresholds are configurable — when MIRA changes a rate, you update it once and every future return uses it.',
          ],
        },
      ]}
      faqs={[
        { q: 'Does Vayves file my MIRA return for me?', a: 'Vayves computes and assembles the figures (TGST, Green Tax, MIRA 206) per property and shows your deadline. You review and submit through MIRAconnect — the software removes the manual calculation, not your final review.' },
        { q: 'What is the current TGST rate?', a: 'TGST is 17% on tourism goods and services, effective 1 July 2025. Vayves keeps the rate configurable so it stays correct if MIRA changes it.' },
        { q: 'How much is Green Tax?', a: 'USD 6 per guest per night for guesthouses of 50 rooms or fewer on inhabited islands, and USD 12 for properties over 50 rooms and resorts. Children under 2 are exempt.' },
        { q: 'Can it handle more than one property?', a: 'Yes. Each property files its own return under its own TIN, and Vayves computes Green Tax at the right room-count tier for each one separately.' },
        { q: 'When are Maldives tourism taxes due?', a: 'Green Tax and monthly TGST are filed via MIRAconnect by around the 28th of the following month. Vayves shows a due-date dashboard so you never miss it.' },
        { q: 'Is this tax advice?', a: 'No — Vayves is software that computes your figures from your bookings using current published rates. For interpretation of your obligations, consult MIRA or a licensed accountant.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'Local payments (BML, Maya)', href: '/payments-maldives' },
        { label: 'Channel manager', href: '/channel-manager' },
        { label: 'Pricing & free plan', href: '/free' },
      ]}
    />
  );
}
