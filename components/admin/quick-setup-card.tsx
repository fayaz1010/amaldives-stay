'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Search, Check, ExternalLink } from 'lucide-react';

interface Hit {
  // Stable string id from Google Places (we used to use a numeric Hotellook id).
  id: string;
  placeId?: string;
  name: string;
  fullName: string;
  city: string;
  country: string;
  rating?: number | null;
  userRatingsTotal?: number | null;
  photos: string[];
}

interface Props {
  defaultName?: string;
  onManualSetup: () => void;
  onSeeded: () => void;
}

/**
 * One-click setup card shown above the manual onboarding wizard when a
 * tenant has zero rooms. Owner types their guesthouse name; we search
 * Hotellook for a Maldives match; owner picks one; we seed the tenant
 * as a DRAFT they can review on /admin/web before publishing.
 *
 * Designed mobile-first — most guesthouse owners only have a phone.
 */
export function QuickSetupCard({ defaultName = '', onManualSetup, onSeeded }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultName);
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    setHits([]);
    try {
      const res = await fetch('/api/admin/seed/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Search failed');
      setHits(j.hits || []);
    } catch (e: any) {
      setError(e?.message || 'Search failed. Try again or use Manual setup.');
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  async function apply(hit: Hit) {
    setApplying(hit.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/seed/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: hit.placeId ?? hit.id,
          name: hit.name,
          city: hit.city,
          country: hit.country,
          photos: hit.photos,
          starterRoomCount: 4,
          starterRoomPrice: 85,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Seed failed');
      onSeeded();
      router.refresh();
      router.push(j.next || '/admin/web');
    } catch (e: any) {
      setError(e?.message || 'Seed failed. Try Manual setup.');
      setApplying(null);
    }
  }

  return (
    <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <CardContent className="p-5 md:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-cyan-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              One-click setup from Booking.com
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-0.5">
              Type your guesthouse name and we&apos;ll find it, import the photos,
              and pre-fill your rooms. You review on the next page and click
              <span className="font-medium"> Publish</span> when ready.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="e.g. Rivethi Beach"
            className="flex-1"
          />
          <Button
            onClick={search}
            disabled={searching || query.trim().length < 2}
            className="bg-cyan-600 hover:bg-cyan-700 gap-2"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searching ? 'Searching…' : 'Find my guesthouse'}
          </Button>
        </div>

        {error && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {hits.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">
              Pick the one that matches your property:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hits.map((hit) => (
                <div
                  key={hit.id}
                  className="rounded-lg border bg-white overflow-hidden flex flex-col"
                >
                  <div className="aspect-video bg-gray-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hit.photos[0]}
                      alt={hit.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                    {hit.rating ? (
                      <span className="absolute top-2 right-2 text-[10px] bg-white/90 px-1.5 py-0.5 rounded font-medium">
                        {hit.rating.toFixed(1)}★
                        {hit.userRatingsTotal ? ` · ${hit.userRatingsTotal}` : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {hit.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {hit.city || '—'}, {hit.country}
                      </p>
                    </div>
                    <Button
                      onClick={() => apply(hit)}
                      disabled={applying !== null}
                      size="sm"
                      className="mt-auto bg-cyan-600 hover:bg-cyan-700 gap-1.5"
                    >
                      {applying === hit.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Importing…
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          That&apos;s my guesthouse
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searched && hits.length === 0 && !searching && (
          <div className="rounded border bg-white px-3 py-3 text-xs text-gray-600">
            No Maldives matches for <span className="font-medium">&ldquo;{query}&rdquo;</span>.
            Try a shorter name (e.g. just &ldquo;Rivethi&rdquo;) or set up manually.
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500">
            Not finding it? Skip and add rooms yourself.
          </span>
          <button
            type="button"
            onClick={onManualSetup}
            className="text-cyan-700 hover:underline font-medium gap-1 inline-flex items-center"
          >
            Manual setup <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
