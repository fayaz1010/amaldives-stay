import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchArticle, fetchArticles } from '@/lib/blog';
import { PMS_BASE } from '@/lib/domain';
import { Markdown } from '@/components/markdown';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const article = await fetchArticle(params.slug);

  if (!article) {
    return {
      title: 'Article Not Found — Vayves',
    };
  }

  return {
    title: `${article.title} — Vayves`,
    description: article.excerpt,
    keywords: article.keywords,
    alternates: {
      canonical: `${PMS_BASE}/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      url: `${PMS_BASE}/blog/${article.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const articles = await fetchArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const article = await fetchArticle(params.slug);

  if (!article) {
    notFound();
  }

  // JSON-LD structured data for Article
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'Vayves',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vayves',
      url: PMS_BASE,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${PMS_BASE}/blog/${article.slug}`,
    },
    wordCount: article.wordCount,
    keywords: article.keywords.join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
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

        {/* Article */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="mb-8">
            <Link
              href="/blog"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back to Blog
            </Link>
          </nav>

          <article>
            <header className="mb-10">
              <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight leading-tight">
                {article.title}
              </h1>
              <div className="flex items-center text-sm text-gray-600">
                <time dateTime={article.publishedAt}>
                  {new Date(article.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span className="mx-2">·</span>
                <span>{Math.ceil(article.wordCount / 200)} min read</span>
              </div>
            </header>

            <div className="prose prose-lg max-w-none">
              <Markdown content={article.content} />
            </div>
          </article>

          <footer className="mt-16 pt-8 border-t border-gray-200">
            <Link
              href="/blog"
              className="text-gray-900 font-medium hover:underline"
            >
              ← Back to Blog
            </Link>
          </footer>
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
    </>
  );
}
