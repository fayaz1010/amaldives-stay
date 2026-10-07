import type { MetadataRoute } from 'next';
import { PMS_BASE } from '@/lib/domain';
import { fetchArticles } from '@/lib/blog';

// Public marketing surface for the Vayves hotel-PMS site (vayves.com).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: Array<{ path: string; priority: number; freq: 'weekly' | 'monthly' }> = [
    { path: '', priority: 1.0, freq: 'weekly' },
    // Tier 1 landing pages
    { path: '/maldives', priority: 0.9, freq: 'weekly' },
    { path: '/mira-tax', priority: 0.9, freq: 'weekly' },
    { path: '/free', priority: 0.8, freq: 'weekly' },
    { path: '/little-hotelier-alternative', priority: 0.8, freq: 'weekly' },
    { path: '/channel-manager', priority: 0.8, freq: 'weekly' },
    // Tier 2 landing pages
    { path: '/small-hotels', priority: 0.7, freq: 'weekly' },
    { path: '/direct-booking', priority: 0.7, freq: 'weekly' },
    { path: '/payments-maldives', priority: 0.7, freq: 'monthly' },
    { path: '/vs-cloudbeds', priority: 0.7, freq: 'monthly' },
    { path: '/resorts', priority: 0.7, freq: 'monthly' },
    // Funnel
    { path: '/for-guesthouses', priority: 0.7, freq: 'weekly' },
    { path: '/claim', priority: 0.6, freq: 'monthly' },
    // Blog
    { path: '/blog', priority: 0.8, freq: 'weekly' },
    // Legal + contact
    { path: '/contact', priority: 0.4, freq: 'monthly' },
    { path: '/privacy', priority: 0.3, freq: 'monthly' },
    { path: '/terms', priority: 0.3, freq: 'monthly' },
  ];

  // Fetch blog articles dynamically
  const articles = await fetchArticles();
  const articleRoutes = articles.map((article) => ({
    path: `/blog/${article.slug}`,
    priority: 0.7,
    freq: 'monthly' as const,
  }));

  // Always include the known guest house article, even if the list endpoint is empty
  const knownArticleSlugs = ['guest-house-management-software-maldives'];
  const existingSlugs = new Set(articles.map((a) => a.slug));
  const missingArticles = knownArticleSlugs
    .filter((slug) => !existingSlugs.has(slug))
    .map((slug) => ({
      path: `/blog/${slug}`,
      priority: 0.7,
      freq: 'monthly' as const,
    }));

  const allRoutes = [...routes, ...articleRoutes, ...missingArticles];

  return allRoutes.map((r) => ({
    url: `${PMS_BASE}${r.path}`,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
