import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Resort & Island Property Management Software — Maldives | Vayves',
  description:
    'Vayves runs resorts and island properties: reservations, channel manager, transfers, F&B and minibar, MIRA-ready TGST & Green Tax and local payments — with commission-free demand from amaldives.com.',
  alternates: { canonical: 'https://vayves.com/resorts' },
};

export default function ResortsPage() {
  return (
    <MarketingLanding
      path="/resorts"
      metaDescription={metadata.description as string}
      badge="For resorts & island properties"
      h1="Resort & island property management software"
      wedge="From a boutique island retreat to a multi-property group, Vayves handles the full operation — reservations, transfers, F&B, staff and MIRA-ready tax — with commission-free demand from amaldives.com."
      intro="Resorts and island properties have moving parts a generic PMS ignores: seaplane and speedboat transfers, F&B outlets and minibars, island logistics and supply, per-property tax at the higher Green Tax tier. Vayves is built for that reality, and scales from one property to a group under one login."
      sections={[
        {
          h2: 'Everything an island property runs on',
          bullets: [
            'Reservations, availability and group bookings across all room types.',
            'Transfers & arrivals — seaplane, speedboat and ferry scheduling with guest confirmations.',
            'F&B, minibar, logistics and island supply — the operations beyond the front desk.',
            'Staff — clock-in, tasks, SOPs and payroll, with the 10% service-charge ledger.',
            'MIRA-ready tax — TGST 17% and Green Tax at USD 12/guest/night for properties over 50 rooms and resorts.',
            'Local payments — BML Connect, Maya, cards and pay-at-property.',
          ],
        },
        {
          h2: 'Multi-property, one system',
          paragraphs: [
            'Own more than one property? Vayves supports multi-property groups with shared staff and inventory where you want it, and separate MIRA returns per property — each under its own TIN, at the correct Green Tax tier. Switch between properties from a single login.',
          ],
        },
        {
          h2: 'Demand as well as management',
          paragraphs: [
            'Vayves connects your resort to amaldives.com — a traveller directory of 200+ resorts and 900+ guesthouses — so you take direct bookings at a 4% platform fee instead of OTA commission, on top of your own booking website and channel sync.',
          ],
        },
      ]}
      faqs={[
        { q: 'Does Vayves handle seaplane and speedboat transfers?', a: 'Yes — transfer scheduling for seaplane, speedboat and ferry is built in, with arrival/departure coordination and guest confirmations.' },
        { q: 'How is Green Tax handled for a resort?', a: 'Resorts and properties over 50 rooms are computed at the USD 12 per guest, per night tier automatically, with under-2s exempt, ready for your monthly MIRA return.' },
        { q: 'Can I manage several properties in one account?', a: 'Yes. Vayves supports multi-property groups with shared or separate staff, inventory and tax per property, all under a single login.' },
        { q: 'Does it include F&B and minibar management?', a: 'Yes — F&B outlets, minibar, logistics and island inventory are part of the system alongside reservations and housekeeping.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'MIRA tax module', href: '/mira-tax' },
        { label: 'Channel manager', href: '/channel-manager' },
        { label: 'Local payments (BML, Maya)', href: '/payments-maldives' },
      ]}
    />
  );
}
