import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/landing';

export const metadata: Metadata = {
  title: 'Hotel & Guesthouse Management Software — 30-Day Free Trial | Vayves',
  description:
    'Try Vayves free for 30 days: direct-booking website, amaldives.com listing, channel sync and local payments. Card required. Cancel anytime.',
  alternates: { canonical: 'https://vayves.com/free' },
};

export default function FreePage() {
  return (
    <MarketingLanding
      path="/free"
      metaDescription={metadata.description as string}
      badge="30-day free trial"
      h1="Hotel & guesthouse management software with a 30-day free trial"
      wedge="Try Vayves free for 30 days: direct-booking website, amaldives.com listing, channel sync and local payments. Card required. Cancel anytime to avoid charges."
      ctaLabel="Start 30-day free trial"
      intro="Most hotel software either charges you upfront or traps you in a short trial. Vayves gives you a full 30 days to test direct bookings, channel sync to Booking.com and Agoda, and local payment options — all before the first charge. Start with Growth ($19/mo) and cancel before the trial ends if it's not the right fit."
      sections={[
        {
          h2: 'What you get in the 30-day trial',
          bullets: [
            'Your own direct-booking website on a {name}.vayves.com address.',
            'A listing on amaldives.com — real traveller demand, direct bookings at a 10% platform fee for marketplace bookings (4% on your own stay page).',
            'Channel sync to Booking.com, Agoda, and Airbnb.',
            'Reservations, availability calendar and a guest portal.',
            'Connect Stripe, BML Connect, or Maya for online payments.',
            'Card required at signup; no charge for 30 days. Cancel before trial ends to avoid the monthly subscription.',
          ],
        },
        {
          h2: 'After the trial',
          paragraphs: [
            'If you don't cancel, you'll be charged the monthly subscription price for your chosen plan:',
          ],
          bullets: [
            'Growth ($19/mo): channel manager (Booking.com, Agoda, Airbnb) + SMS notifications.',
            'Business ($49/mo): API access, multi-property, and the full MIRA tax module.',
            'Channel Plus ($79/mo): priority channel sync and Stripe direct payouts.',
          ],
        },
        {
          h2: 'Why the trial model works',
          paragraphs: [
            'Vayves can offer a generous 30-day trial because the platform is aligned with your success: when amaldives.com sends you a booking, the platform earns a 10% fee for marketplace bookings — still below the 15–18% OTAs take. You get the full software trial and keep most of the margin; the platform grows when you take bookings.',
          ],
        },
      ]}
      pricing={[
        { tier: 'Growth', price: '$19/mo', blurb: '30-day free trial. Channel sync + SMS.' },
        { tier: 'Business', price: '$49/mo', blurb: 'API + multi-property + tax module.' },
        { tier: 'Channel Plus', price: '$79/mo', blurb: 'Priority sync + Stripe payouts.' },
      ]}
      faqs={[
        { q: 'Is the trial really free?', a: 'Yes — 30 days at no charge. A card is required at signup, and you'll be charged the monthly subscription price after 30 days unless you cancel.' },
        { q: 'What happens if I cancel before 30 days?', a: 'No charge. Cancel anytime during the trial through the Stripe customer portal to avoid being billed.' },
        { q: 'Do I need a credit card to start?', a: 'Yes. A card is collected upfront for the trial, but you won't be charged until the 30 days are up.' },
        { q: 'Can I take payments during the trial?', a: 'Yes — you can connect Stripe, BML Connect, or Maya during the trial for online guest payments.' },
      ]}
      related={[
        { label: 'Maldives hotel management software', href: '/maldives' },
        { label: 'Little Hotelier alternative', href: '/little-hotelier-alternative' },
        { label: 'Channel manager', href: '/channel-manager' },
        { label: 'Zero-commission direct booking', href: '/direct-booking' },
      ]}
    />
  );
}
