import type { MetadataRoute } from 'next';
import { PMS_BASE } from '@/lib/domain';

// Public marketing + tenant booking pages are indexable; app internals are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/super-admin', '/agent', '/guest', '/api', '/auth'],
    },
    sitemap: `${PMS_BASE}/sitemap.xml`,
    host: PMS_BASE,
  };
}
