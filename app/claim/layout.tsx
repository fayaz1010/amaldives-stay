import type { Metadata } from 'next';

// app/claim/page.tsx is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Claim Your amaldives.com Guesthouse Listing | Vayves',
  description:
    'Claim your guesthouse from its amaldives.com listing and verify ownership with your business email, or start a 30-day free Vayves trial for direct bookings.',
  alternates: { canonical: 'https://vayves.com/claim' },
};

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
