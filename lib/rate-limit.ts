import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Prisma-backed sliding-window rate limiter — no external service.
 * Counts hits per key inside the window; inserts a hit only when allowed,
 * so blocked requests don't extend the window.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number }> {
  const since = new Date(Date.now() - windowMs);

  try {
    const count = await prisma.rateLimitHit.count({
      where: { key, createdAt: { gte: since } },
    });
    if (count >= limit) {
      return { ok: false, remaining: 0 };
    }

    await prisma.rateLimitHit.create({ data: { key } });

    // Opportunistic pruning (~2% of allowed requests) keeps the table small.
    if (Math.random() < 0.02) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      prisma.rateLimitHit
        .deleteMany({ where: { createdAt: { lt: dayAgo } } })
        .catch(() => {});
    }

    return { ok: true, remaining: limit - count - 1 };
  } catch (err) {
    // Fail open: a rate-limiter outage must never take down the endpoint.
    console.error('[rate-limit] check failed for', key, err);
    return { ok: true, remaining: limit };
  }
}

/** Best-effort client IP (Vercel sets x-forwarded-for; first hop = client). */
export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function tooManyRequests(message = 'Too many requests. Try again later.') {
  return Response.json({ error: message }, { status: 429 });
}
