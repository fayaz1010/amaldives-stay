import type { MetadataRoute } from 'next';
import { PMS_BASE } from '@/lib/domain';

// Public marketing surface for the Vayves hotel-PMS site (vayves.com).
export default function sitemap(): MetadataRoute.Sitemap {
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
  ];
  return routes.map((r) => ({
    url: `${PMS_BASE}${r.path}`,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
