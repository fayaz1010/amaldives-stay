import { Metadata } from 'next';
import Link from 'next/link';
import { fetchArticles } from '@/lib/blog';
import { PMS_BASE } from '@/lib/domain';

export const metadata: Metadata = {
  title: 'Blog — Vayves',
  description:
    'Hotel management insights, guides and updates for independent hotels, guesthouses and resorts.',
  alternates: {
    canonical: `${PMS_BASE}/blog`,
  },
};

export default async function BlogIndexPage() {
  const articles = await fetchArticles();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vayves-logo.svg" alt="Vayves" className="h-9 w-auto" />
            </Link>
            <nav className="hidden md:flex space-x-10">
              <Link
                href="/#features"
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                className="text-gray-900 font-medium text-sm border-b-2 border-gray-900"
              >
                Blog
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-700 hover:text-gray-900 font-medium text-sm"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
            Blog
          </h1>
          <p className="text-xl text-gray-600 font-light">
            Practical guides and insights for independent hotel operators.
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">
              Articles are coming soon. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {articles.map((article) => (
              <article key={article.slug} className="border-b border-gray-100 pb-12 last:border-0">
                <Link href={`/blog/${article.slug}`} className="group">
                  <h2 className="text-2xl md:text-3xl font-medium text-gray-900 mb-3 group-hover:text-gray-600 transition-colors">
                    {article.title}
                  </h2>
                </Link>
                <p className="text-gray-600 text-base leading-relaxed mb-4">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="text-gray-900 font-medium text-sm hover:underline"
                  >
                    Read article →
                  </Link>
                  <time
                    dateTime={article.publishedAt}
                    className="text-sm text-gray-500"
                  >
                    {new Date(article.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vayves-logo.svg" alt="Vayves" className="h-9 w-auto" />
            </div>
            <p className="text-gray-500 mb-8 text-sm">
              Property management software for independent hotels
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <Link href="/maldives" className="text-gray-600 hover:text-gray-900 transition-colors">
                Maldives Hotels
              </Link>
              <Link href="/for-guesthouses" className="text-gray-600 hover:text-gray-900 transition-colors">
                For Guesthouses
              </Link>
              <Link href="/channel-manager" className="text-gray-600 hover:text-gray-900 transition-colors">
                Channel Manager
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">
                Blog
              </Link>
            </div>
            <div className="mt-8 text-gray-400 text-sm">
              © 2026 Vayves · by AMaldives
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
