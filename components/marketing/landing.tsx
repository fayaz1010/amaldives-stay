import Link from 'next/link';
import { PMS_BASE } from '@/lib/domain';

export type Section = {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type FaqItem = { q: string; a: string };

export type ComparisonTable = {
  caption?: string;
  headers: string[]; // first col = feature label
  rows: Array<{ label: string; cells: string[] }>;
};

export type LandingProps = {
  badge: string;
  h1: string;
  wedge: string; // above-fold value sentence
  intro?: string;
  sections: Section[];
  table?: ComparisonTable;
  pricing?: Array<{ tier: string; price: string; blurb: string }>;
  faqs?: FaqItem[];
  ctaLabel?: string;
  related: Array<{ label: string; href: string }>;
  // schema
  path: string; // e.g. /maldives
  metaTitle?: string;
  metaDescription: string;
};

function Cta({ label = 'Claim your free account' }: { label?: string }) {
  return (
    <Link
      href="/claim"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-600/20 transition-colors hover:bg-cyan-700"
    >
      {label} →
    </Link>
  );
}

export function MarketingLanding(props: LandingProps) {
  const {
    badge, h1, wedge, intro, sections, table, pricing, faqs, ctaLabel, related, path, metaDescription,
  } = props;

  const url = `${PMS_BASE}${path}`;
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Vayves',
    description: metaDescription,
    brand: { '@type': 'Brand', name: 'Vayves' },
    applicationCategory: 'Hotel Management Software',
    url,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free plan; paid tiers from $19/mo' },
  };
  const faqLd = faqs && faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" aria-label="Vayves home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vayves-logo.svg" alt="Vayves" className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/for-guesthouses" className="hidden text-gray-600 hover:text-cyan-700 sm:inline">Product</Link>
            <Link href="/auth/signin" className="text-gray-600 hover:text-cyan-700">Sign in</Link>
            <Link href="/claim" className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700">Start free</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-16 pb-10 text-center">
        <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">{badge}</span>
        <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{h1}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">{wedge}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Cta label={ctaLabel} />
          <Link href="/for-guesthouses" className="text-sm font-semibold text-cyan-700 hover:underline">See how it works →</Link>
        </div>
        {intro && <p className="mx-auto mt-8 max-w-2xl text-left text-gray-600">{intro}</p>}
      </section>

      {/* Sections */}
      <div className="mx-auto max-w-3xl px-5">
        {sections.map((s, i) => (
          <section key={i} className="border-t py-10">
            <h2 className="text-2xl font-bold text-gray-900">{s.h2}</h2>
            {s.paragraphs?.map((p, j) => (
              <p key={j} className="mt-4 text-gray-700 leading-relaxed">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-4 space-y-2">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex gap-3 text-gray-700">
                    <span className="mt-1 text-cyan-600">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* Comparison table */}
        {table && (
          <section className="border-t py-10">
            {table.caption && <h2 className="mb-4 text-2xl font-bold">{table.caption}</h2>}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {table.headers.map((h, i) => (
                      <th key={i} className={`border-b p-3 font-semibold ${i === 1 ? 'text-cyan-700' : 'text-gray-700'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={i} className="align-top">
                      <td className="border-b p-3 font-medium text-gray-900">{r.label}</td>
                      {r.cells.map((c, j) => (
                        <td key={j} className={`border-b p-3 ${j === 0 ? 'font-semibold text-teal-700' : 'text-gray-600'}`}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Pricing */}
        {pricing && (
          <section className="border-t py-10">
            <h2 className="text-2xl font-bold">Pricing</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {pricing.map((p, i) => (
                <div key={i} className="rounded-2xl border p-5">
                  <div className="text-sm font-semibold text-teal-700">{p.tier}</div>
                  <div className="mt-1 text-2xl font-bold">{p.price}</div>
                  <p className="mt-2 text-sm text-gray-600">{p.blurb}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqs && faqs.length > 0 && (
          <section className="border-t py-10">
            <h2 className="text-2xl font-bold">Frequently asked questions</h2>
            <div className="mt-5 space-y-5">
              {faqs.map((f, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-gray-900">{f.q}</h3>
                  <p className="mt-2 text-gray-700">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CTA band */}
      <section className="mx-auto mt-6 max-w-4xl px-5">
        <div className="rounded-3xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-12 text-center text-white">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to run your property on Vayves?</h2>
          <p className="mx-auto mt-3 max-w-xl text-teal-50">Free to start. Set up in minutes. No card required.</p>
          <div className="mt-6">
            <Link href="/claim" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 font-semibold text-cyan-700 hover:bg-cyan-50">
              {ctaLabel || 'Claim your free account'} →
            </Link>
          </div>
        </div>
      </section>

      {/* Related + footer */}
      <footer className="mt-12 bg-gray-900 py-12 text-gray-300">
        <div className="mx-auto max-w-6xl px-5">
          {related.length > 0 && (
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-400">Related</div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {related.map((r, i) => (
                  <Link key={i} href={r.href} className="text-sm text-gray-200 hover:text-white hover:underline">{r.label}</Link>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-800 pt-6 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vayves-logo-light.svg" alt="Vayves" className="h-8 w-auto" />
            <p className="text-xs text-gray-500">© 2026 Vayves · Hotel management software · by AMaldives</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
