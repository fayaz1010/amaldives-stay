import Link from 'next/link';

export const LEGAL_CONTACT_EMAIL = 'hello@vayves.com';
export const LEGAL_OPERATOR = 'Oz Systems';
export const LEGAL_UPDATED = '7 October 2026';

/** Shared footer links to the legal and contact pages. */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap gap-x-6 gap-y-2 text-sm ${className}`}>
      <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
      <Link href="/terms" className="hover:underline">Terms of Service</Link>
      <Link href="/contact" className="hover:underline">Contact</Link>
    </nav>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="Vayves home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vayves-logo.svg" alt="Vayves" className="h-8 w-auto" />
          </Link>
          <Link href="/auth/signin" className="text-sm text-cyan-700 hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LEGAL_UPDATED}</p>
        {intro && <div className="mt-6 text-base text-gray-700">{intro}</div>}
        <div className="legal-body mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mt-2 [&_a]:text-cyan-700 [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <LegalLinks />
          <p className="text-xs text-gray-400">© 2026 Vayves · operated by {LEGAL_OPERATOR}</p>
        </div>
      </footer>
    </div>
  );
}
