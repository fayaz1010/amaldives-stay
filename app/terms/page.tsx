import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service · Vayves',
  description:
    'The terms for using Vayves booking and front-desk software, including the 30-day free trial, subscriptions, billing and cancellation.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  const mail = `mailto:${LEGAL_CONTACT_EMAIL}`;
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms apply when you create a Vayves account or use the Vayves service. Vayves is operated
          by {LEGAL_OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account you agree to
          them on behalf of yourself and the business you sign up for.
        </p>
      }
    >
      <section>
        <h2>The service</h2>
        <p>
          Vayves gives guesthouses a booking website, reservations and front-desk tools, guest
          communication and channel sync. Features depend on your plan and may change as we improve the
          product. We aim to keep Vayves available at all times but cannot promise it will be
          uninterrupted or error-free.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Give accurate details and confirm your email address.</li>
          <li>Keep your password safe; you are responsible for activity under your account and your staff accounts.</li>
          <li>Only claim or set up a property you own or are authorised to manage.</li>
        </ul>
      </section>

      <section>
        <h2>Free trial, subscription and billing</h2>
        <ul>
          <li>
            New accounts can start a 30-day free trial. To start it you enter a payment card, which is
            saved by our payment processor, Stripe. You are not charged during the trial.
          </li>
          <li>
            Unless you cancel before the trial ends, your subscription starts automatically and your card
            is charged the plan price (Growth: US$19 per month) at the end of the trial and then every
            month in advance until you cancel.
          </li>
          <li>
            Prices for each plan are shown on our website and on the billing page before you subscribe.
            Prices are in US dollars and exclude any taxes that apply; if we change a price we will tell
            you at least 30 days before it affects your next payment.
          </li>
          <li>
            Bookings may also carry a platform fee where shown on our pricing (for example a fee on
            bookings delivered through amaldives.com, and a fee on direct bookings). The rate that applies
            is shown in your admin.
          </li>
          <li>
            You can cancel any time from Settings &rarr; Billing in the admin, or by emailing us. Cancelling
            stops future payments; you keep access until the end of the period you have paid for. Payments
            already made are not refunded except where the law requires it or we agree otherwise.
          </li>
          <li>If a payment fails we may limit or suspend the account until it is resolved.</li>
        </ul>
      </section>

      <section>
        <h2>Your data and your guests&apos; data</h2>
        <p>
          You own the content and data you put into Vayves. You let us store and process it to provide the
          service. You are responsible for having the right to collect your guests&apos; details and for
          telling guests how you use them. How we handle personal data is described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>Do not use Vayves to break the law, send spam, publish misleading listings, attempt to access other accounts or data, or interfere with the service.</p>
      </section>

      <section>
        <h2>Ending the service</h2>
        <p>
          You can close your account at any time. We may suspend or close an account that breaks these
          terms or does not pay, and will tell you why where we can. After closure you can ask us for an
          export of your data within 30 days.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          We provide Vayves with reasonable care and skill. To the extent the law allows, we are not
          liable for indirect losses such as lost profits or lost bookings, and our total liability to you
          in any 12-month period is limited to the subscription fees you paid us in that period. Nothing in
          these terms limits rights you have that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms. We will change the date at the top and tell account holders by email
          about significant changes before they apply. Continuing to use Vayves after that means you accept
          the updated terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms or your bill: <a href={mail}>{LEGAL_CONTACT_EMAIL}</a>, or see our{' '}
          <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
