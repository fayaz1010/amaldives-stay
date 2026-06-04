import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Run your guesthouse & fill more rooms — stay by aMaldives',
  description:
    'The all-in-one system built for Maldivian guesthouses: reservations, transfers, staff, MIRA tax reports, payments (BML, Maya, cards), and your own booking website. Listed free on amaldives.com.',
};

// Owner's WhatsApp number in international format without "+" (e.g. 9607XXXXXX).
const WA = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '9600000000').replace(/[^0-9]/g, '');
const waLink = (msg: string) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
const HERO_MSG = 'Hi — I run a guesthouse in the Maldives and want to see how stay works for my property.';

function Cta({ children, msg }: { children: React.ReactNode; msg: string }) {
  return (
    <a
      href={waLink(msg)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-green-600/20 hover:bg-green-700"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.711z" />
      </svg>
      {children}
    </a>
  );
}

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-5xl px-5 py-12 ${className}`}>
      {children}
    </section>
  );
}

export default function ForGuesthousesPage() {
  const features = [
    ['🛎️', 'Front desk & reservations', 'Rooms, availability, group bookings — all in one calendar.'],
    ['🚤', 'Transfers & arrivals', 'Speedboat, ferry & seaplane scheduling, jetty/airport, transfer confirmations.'],
    ['🧹', 'Housekeeping & maintenance', 'Room status, tasks, issues — assign and track on the phone.'],
    ['👥', 'Staff, tasks & payroll', 'Clock-in, SOPs, service charge distribution, payroll.'],
    ['🍽️', 'F&B & minibar', 'Outlets, menus, bills, minibar usage tied to the room.'],
    ['📦', 'Logistics & stock', 'Order and track supplies shipped from Malé to your island.'],
    ['🧾', 'MIRA tax, done for you', 'Auto TGST (17%) returns + Green Tax (per guest-night) + GST-ready reports.'],
    ['💳', 'Local payments', 'BML Connect, Maya, cards & cash — in MVR or USD.'],
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-cyan-600 to-teal-600 text-white">
        <Section className="!py-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-100">
            stay · by aMaldives (ATT licensed travel agency)
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            Run your guesthouse from your phone — and fill more rooms.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-cyan-50 sm:text-lg">
            The all-in-one system built for Maldivian guesthouses: reservations, transfers, staff, MIRA tax — plus your
            own booking website, listed free on <strong>amaldives.com</strong>. From $19/month.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Cta msg={HERO_MSG}>Message us on WhatsApp</Cta>
            <a href="#how" className="text-sm font-medium text-cyan-50 underline underline-offset-4">
              See how it works ↓
            </a>
          </div>
        </Section>
      </div>

      {/* Pain */}
      <Section>
        <h2 className="text-center text-2xl font-bold">Sound familiar?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            'OTAs take 15–18% commission on every booking.',
            'Double-bookings between Booking.com, Airbnb and walk-ins.',
            'Transfers and arrivals juggled across WhatsApp groups.',
            'Supplies, staff and cash tracked on paper and spreadsheets.',
            'MIRA TGST & Green Tax filing every month — by hand.',
            'No website of your own — fully dependent on the OTAs.',
          ].map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <span className="text-red-500">✕</span>
              <span className="text-sm text-gray-700">{p}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section id="how" className="!pt-4">
        <h2 className="text-center text-2xl font-bold">One system for all of it</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-500">
          Built for island guesthouses — not adapted from a foreign hotel system.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([icon, title, desc]) => (
            <div key={title} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="text-2xl">{icon}</div>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Direct bookings */}
      <div className="bg-cyan-50">
        <Section>
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">More direct bookings, less commission</h2>
              <p className="mt-3 text-sm text-gray-700">
                Get your own booking website (and your own domain, if you want) with availability synced to Booking.com
                and Airbnb so you never double-book. Listed on <strong>amaldives.com</strong> — seen by travellers
                searching the Maldives — sending you bookings with no OTA cut.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {['Your own website + brand email on your domain', 'Channel sync — one calendar, no clashes', 'Keep the 15–18% you lose to OTAs'].map(
                  (x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> {x}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Already on amaldives.com?</p>
              <p className="mt-1 text-sm text-gray-700">
                Your guesthouse may already have a page getting visitors. Claim it free and switch on direct bookings.
              </p>
              <a
                href="/claim"
                className="mt-4 inline-block rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
              >
                Claim your listing
              </a>
            </div>
          </div>
        </Section>
      </div>

      {/* Pricing */}
      <Section>
        <h2 className="text-center text-2xl font-bold">Simple pricing</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            ['Growth', '$19/mo', ['Channel sync', 'Reservations & calendar', 'SMS']],
            ['Business', '$49/mo', ['Everything in Growth', 'Multi-property', 'API access']],
            ['Web Presence', '+$29/mo', ['Own-domain website', 'Brand email', 'Hosting included']],
          ].map(([name, price, items], i) => (
            <div
              key={name as string}
              className={`rounded-2xl border p-6 ${i === 1 ? 'border-cyan-500 shadow-lg' : 'border-gray-200'}`}
            >
              <h3 className="font-bold">{name}</h3>
              <p className="mt-1 text-2xl font-extrabold text-cyan-700">{price}</p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                {(items as string[]).map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="text-green-600">✓</span> {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">Free to list on amaldives.com. No long contracts.</p>
      </Section>

      {/* Final CTA */}
      <div className="bg-gradient-to-br from-cyan-600 to-teal-600 text-white">
        <Section className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Let&apos;s get your guesthouse online</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-cyan-50">
            Message us on WhatsApp — we&apos;ll set up a demo with your property and answer any questions, in Dhivehi or
            English.
          </p>
          <div className="mt-6 flex justify-center">
            <Cta msg={HERO_MSG}>Message us on WhatsApp</Cta>
          </div>
          <p className="mt-6 text-xs text-cyan-100">Made in the Maldives · ATT licensed travel agency · BML / Maya / MVR</p>
        </Section>
      </div>

      {/* Floating WhatsApp */}
      <a
        href={waLink(HERO_MSG)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp us"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-xl hover:bg-green-700"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.711z" />
        </svg>
      </a>
    </main>
  );
}
