import type { Metadata } from 'next';
import { LegalPage, LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy · Vayves',
  description:
    'How Vayves collects, uses and protects personal data for guesthouse owners, their staff and their guests.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const mail = `mailto:${LEGAL_CONTACT_EMAIL}`;
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Vayves is booking and front-desk software for guesthouses, operated by {LEGAL_OPERATOR}{' '}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what personal data we handle when you
          use vayves.com, a guesthouse booking site hosted on Vayves, or the Vayves admin, and what we do
          with it. Questions: <a href={mail}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      }
    >
      <section>
        <h2>Who this covers</h2>
        <ul>
          <li>
            <strong>Owners and staff</strong> of guesthouses who hold a Vayves account. For this data we
            decide how it is used.
          </li>
          <li>
            <strong>Guests</strong> who book or stay at a guesthouse that uses Vayves. The guesthouse
            decides what guest data it collects and why; we store and process it on the guesthouse&apos;s
            behalf to provide the service. For requests about your stay, contact the guesthouse first; we
            will help them respond.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email address, password (stored only as a one-way hash), role.</li>
          <li>
            Business details: guesthouse name, address, contact details, rooms, rates, photos and
            settings you enter, and public listing information from amaldives.com when you claim a
            listing.
          </li>
          <li>
            Booking and guest details entered by guests or staff: names, contact details, stay dates,
            arrival and flight details, passport or ID details where the guesthouse collects them for
            check-in, requests, payments and invoices.
          </li>
          <li>
            Billing details: when you start a trial or subscription, your card is entered on and stored
            by our payment processor, Stripe. We never see or store your full card number; we keep the
            Stripe customer and subscription references and your plan status.
          </li>
          <li>
            Technical data: IP address, browser and device information, and log records used for
            security, rate limiting and fixing faults. We use cookies needed to keep you signed in, and
            Google Analytics cookies to understand how our pages are used (visits, pages viewed, rough
            location from IP). You can block analytics cookies in your browser without affecting the
            service.
          </li>
          <li>Messages you send us, such as support requests, claim or verification requests.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>We use personal data to provide and run the service, and for nothing unrelated to it:</p>
        <ul>
          <li>to create and secure your account, including confirming your email address;</li>
          <li>to run bookings, the front desk, guest messages and channel sync for your guesthouse;</li>
          <li>to take subscription payments and send receipts, trial and billing notices;</li>
          <li>to send service emails (confirmations, password and account notices);</li>
          <li>to contact owners who sign up or ask to be contacted about getting started with Vayves;</li>
          <li>to prevent fraud, spam and abuse, and to keep the service working and secure;</li>
          <li>to meet legal, tax and accounting obligations.</li>
        </ul>
        <p>We do not sell personal data.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We share data only with providers that help us run Vayves, and only as needed:</p>
        <ul>
          <li>Stripe, for card payments and subscriptions;</li>
          <li>Vercel, for hosting the application;</li>
          <li>Amazon Web Services, for file and photo storage;</li>
          <li>Resend, for sending email;</li>
          <li>Cloudflare, for DNS, email routing and bot protection on sign-up forms;</li>
          <li>Google, for website analytics;</li>
          <li>
            booking channels such as Booking.com, Agoda or Airbnb, and amaldives.com, when a guesthouse
            connects them, so availability and bookings stay in sync;
          </li>
          <li>{LEGAL_OPERATOR}&apos;s own sales and support systems, for owner sign-ups and enquiries;</li>
          <li>authorities, where the law requires it.</li>
        </ul>
        <p>
          These providers may process data outside the Maldives. We use providers with appropriate
          security and data-protection commitments.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep account and business data while your account is active. After an account is closed we
          delete or anonymise it within a reasonable period, except records we must keep for legal, tax or
          accounting reasons, or to resolve disputes. Guesthouses decide how long guest records are kept,
          within those limits.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data is sent over encrypted connections (HTTPS), passwords are hashed, access to each
          guesthouse&apos;s data is limited to its own staff accounts, and card data is handled by Stripe.
          No system is perfectly secure; if we learn of a breach affecting your data we will tell you.
        </p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <p>
          You can view and update most account and business details in the admin. You can ask us for a
          copy of your personal data, to correct it, or to delete your account by emailing{' '}
          <a href={mail}>{LEGAL_CONTACT_EMAIL}</a>. You can cancel a subscription at any time from
          Settings &rarr; Billing. We will reply within 30 days.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Vayves accounts are for businesses and adults. We do not knowingly create accounts for children.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update this policy as the service changes. We will change the date at the top, and tell
          account holders by email about significant changes.
        </p>
      </section>
    </LegalPage>
  );
}
