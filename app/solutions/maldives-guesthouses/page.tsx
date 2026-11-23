import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Maldives Guesthouse PMS — USD/MVR Billing, TGST & OTA Sync | Vayves',
  description:
    'Property management for Maldives guesthouses: USD and MVR billing, 10% service charge, 17% TGST and Green Tax breakdowns, transfer logistics, plus Booking.com and Agoda sync.',
  alternates: { canonical: 'https://vayves.com/solutions/maldives-guesthouses' },
};

export default function MaldivesGuesthousesSolutionPage() {
  return (
    <MarketingLanding
      path="/solutions/maldives-guesthouses"
      metaDescription={metadata.description as string}
      badge="Maldives guesthouses"
      h1="PMS built for Maldives guesthouses — taxes, transfers and OTA sync in one place"
      wedge="Run USD and MVR billing, apply the statutory 10% service charge, compute 17% TGST and Green Tax from live bookings, organise island transfers, and keep Booking.com and Agoda in sync — without a spreadsheet."
      ctaLabel="Sign up free"
      secondaryCta={{ label: 'Book a demo', href: '/for-guesthouses' }}
      intro="Island guesthouses juggle guest arrivals, speedboat and domestic-flight transfers, two currencies, MIRA filings and two or three OTAs at once. Vayves is hotel management software shaped for that workflow: one calendar, one ledger, and figures ready for MIRAconnect."
      sections={[
        {
          h2: 'USD and MVR billing on the same stay',
          paragraphs: [
            'Guests often pay in US dollars while local suppliers and staff costs run in Maldivian rufiyaa. Vayves records room, F&B and extras in the currency you quote, keeps a clear bill for the guest, and leaves you a clean ledger for month-end — so cash, card and local wallet payments (BML, Maya) land against the right booking.',
          ],
          bullets: [
            'Quote and collect in USD or MVR per booking line.',
            'Guest folio shows what was charged and in which currency.',
            'Payments and deposits attach to the reservation for reconciliation.',
          ],
        },
        {
          h2: '10% service charge, 17% TGST and Green Tax — broken out clearly',
          paragraphs: [
            'Tourism businesses in the Maldives must levy a service charge of at least 10% under the Employment Act (section 52) and the Regulation on Service Charge; that charge is for staff distribution, not a government tax. Tourism Goods and Services Tax (TGST) is 17% on tourism goods and services from 1 July 2025 (MIRA Goods and Services Tax Act). Green Tax is USD 6 per person per 24-hour stay for tourist guesthouses on inhabited islands with 50 or fewer registered rooms, and USD 12 where the guesthouse has more than 50 rooms or operates on an uninhabited island (MIRA Green Tax guidance, from 1 January 2025). Children under two are exempt from Green Tax.',
            'Vayves computes these lines from live bookings so your guest bill and MIRA-ready totals stay consistent. You still review and file in MIRAconnect — the software does the arithmetic.',
          ],
          bullets: [
            'Service charge ≥10% tracked on tourism services (Employment Act / Regulation on Service Charge).',
            'TGST at 17% on taxable tourism supply from 1 July 2025 (MIRA).',
            'Green Tax at USD 6 or USD 12 per person per 24 hours by establishment type and room count (MIRA).',
            'Sources: mira.gov.mv (GST Act / Green Tax pages) and the Employment Act service-charge rules.',
          ],
        },
        {
          h2: 'Transfer logistics without a separate spreadsheet',
          paragraphs: [
            'Most guesthouse stays include a Male’–island hop: domestic flight, ferry or speedboat. Vayves keeps arrival and departure transfer notes on the reservation so front desk and boat operators see the same guest list, flight times and pickup windows.',
          ],
          bullets: [
            'Arrival and departure transfer details on each booking.',
            'Guest and staff visibility of who needs a boat or airport meet.',
            'Fewer lost pickups when OTA bookings change last minute.',
          ],
        },
        {
          h2: 'Booking.com and Agoda sync',
          paragraphs: [
            'Sell on Booking.com and Agoda without double-booking the same room. Vayves keeps rates and availability aligned across connected channels and closes inventory everywhere when a night sells — then still gives you a direct-booking site on your own subdomain.',
          ],
          bullets: [
            'Two-way style channel sync for rates and availability on connected OTAs.',
            'Automatic close-out when a room is sold on any channel.',
            'Direct bookings on your Vayves site alongside OTA demand.',
          ],
        },
      ]}
      faqs={[
        {
          q: 'What is the current TGST rate for Maldives guesthouses?',
          a: 'Tourism Goods and Services Tax (TGST) is 17% on tourism goods and services from 1 July 2025, per the Maldives Goods and Services Tax Act as published by MIRA. Vayves applies the configured rate to taxable booking lines so your folio and tax totals match.',
        },
        {
          q: 'How much Green Tax do guesthouse guests pay?',
          a: 'From 1 January 2025, tourist guesthouses on inhabited islands with 50 or fewer registered rooms charge USD 6 per person per 24-hour stay; guesthouses with more than 50 rooms or on uninhabited islands charge USD 12. Children under two are exempt (MIRA Green Tax). Vayves counts guest-nights at the correct tier from your property settings.',
        },
        {
          q: 'Is the 10% service charge a tax?',
          a: 'No. Under the Employment Act, tourism businesses must levy a service charge of at least 10% on services, to be distributed to employees (with a small administrative retention capped by law). It appears on the guest bill but is not TGST or Green Tax. Vayves can track it separately from MIRA tax lines.',
        },
        {
          q: 'Can I bill in both USD and MVR?',
          a: 'Yes. You can quote and collect in USD or MVR per stay, attach card and local wallet payments to the booking, and keep a clear guest folio for checkout.',
        },
        {
          q: 'Does Vayves sync Booking.com and Agoda?',
          a: 'Yes. Connected OTA channels receive rate and availability updates from your Vayves calendar so you reduce double-bookings while still taking direct bookings on your own site.',
        },
        {
          q: 'Is this tax advice?',
          a: 'No. Figures cited here follow published MIRA and Employment Act rules. Vayves computes from your bookings using configurable rates; confirm filings with MIRA or a licensed adviser.',
        },
      ]}
      related={[
        { label: 'Channel manager (two-way OTA sync)', href: '/features/channel-manager' },
        { label: 'MIRA tax module', href: '/mira-tax' },
        { label: 'Maldives hotel PMS overview', href: '/maldives' },
        { label: 'Start free', href: '/claim' },
      ]}
    />
  );
}
