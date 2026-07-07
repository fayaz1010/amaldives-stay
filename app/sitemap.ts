import type { MetadataRoute } from 'next';
import { PMS_BASE } from '@/lib/domain';

// Public marketing surface for the Vayves hotel-PMS site (vayves.com).
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority: number; freq: 'weekly' | 'monthly' }> = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/for-guesthouses', priority: 0.8, freq: 'weekly' },
    { path: '/claim', priority: 0.7, freq: 'monthly' },
  ];
  return routes.map((r) => ({
    url: `${PMS_BASE}${r.path}`,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
