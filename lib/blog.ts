// Client for fetching blog articles from Oz Systems HQ.

const API_BASE = 'https://www.ozsystems.com.au/api/public/articles';
const DOMAIN = 'vayves.com';

export interface BlogArticle {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  keywords: string[];
  wordCount: number;
  publishedAt: string;
  updatedAt: string;
  sources: string[];
  isPillar: boolean;
  pillarSlug: string | null;
}

interface ArticleListResponse {
  articles: BlogArticle[];
}

interface ArticleResponse {
  article: BlogArticle;
}

/**
 * Fetch all published articles for vayves.com.
 * Returns empty array if the feed is unavailable or empty.
 */
export async function fetchArticles(): Promise<BlogArticle[]> {
  try {
    const url = `${API_BASE}?domain=${DOMAIN}`;
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch articles: ${res.status}`);
      return [];
    }
    
    const data: ArticleListResponse = await res.json();
    return Array.isArray(data.articles) ? data.articles : [];
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

/**
 * Fetch a single article by slug.
 * Returns null if not found or unavailable.
 */
export async function fetchArticle(slug: string): Promise<BlogArticle | null> {
  try {
    const url = `${API_BASE}?domain=${DOMAIN}&slug=${slug}`;
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    });
    
    if (!res.ok) {
      return null;
    }
    
    const data: ArticleResponse = await res.json();
    return data.article || null;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}
