import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Contact · Vayves',
  description: 'Contact the Vayves team about sign-up, your trial, billing, support or privacy.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const mail = `mailto:${LEGAL_CONTACT_EMAIL}`;
  const wa = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  const hasWhatsApp = wa.length >= 7 && wa !== '9600000000';

  return (
    <LegalPage
      title="Contact us"
      intro={
        <p>
          Vayves is operated by {LEGAL_OPERATOR}. We read every message and usually reply within one
          business day.
        </p>
      }
    >
      <section>
        <h2>Email</h2>
        <p>
          <a href={mail} className="text-lg">{LEGAL_CONTACT_EMAIL}</a>
        </p>
        <p>For sign-up help, your free trial, billing, support, privacy or data requests.</p>
      </section>

      {hasWhatsApp && (
        <section>
          <h2>WhatsApp</h2>
          <p>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Message us on WhatsApp</a>
          </p>
        </section>
      )}

      <section>
        <h2>Getting started</h2>
        <ul>
          <li>
            New guesthouse: <Link href="/auth/signup">start your free 30-day trial</Link>.
          </li>
          <li>
            Already listed on amaldives.com: <Link href="/claim">claim your listing</Link>.
          </li>
          <li>
            Existing customer: <Link href="/auth/signin">sign in</Link> and use Settings &rarr; Billing to
            manage or cancel your subscription.
          </li>
        </ul>
      </section>

      <section>
        <h2>Guests</h2>
        <p>
          Questions about a booking or stay are best answered by the guesthouse itself: use the contact
          details on its booking site or your confirmation email.
        </p>
      </section>
    </LegalPage>
  );
}
