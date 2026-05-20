'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';

interface Props {
  webProfileHref?: string;
}

/**
 * Shown at the top of /admin while the tenant is in draft mode (i.e.
 * just seeded from Hotellook, not yet published). Pushes the owner to
 * review their booking page, then offers a one-click Publish to flip
 * the storefront live.
 */
export function DraftBanner({ webProfileHref = '/admin/web' }: Props) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/seed/publish', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Publish failed');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 md:p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-amber-900">
              Your booking page is in draft
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Imported photos and details look right? Publish to make your
              booking page live. Guests can&apos;t book until you do.
            </p>
            {error && (
              <p className="text-xs text-red-700 mt-1">{error}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href={webProfileHref}>
            <Button variant="outline" size="sm" className="text-xs">
              Review &amp; edit
            </Button>
          </a>
          <Button
            onClick={publish}
            disabled={publishing}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
