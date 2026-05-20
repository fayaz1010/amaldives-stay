'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Sparkles,
  Search,
  Check,
  ExternalLink,
  Link as LinkIcon,
  Camera,
} from 'lucide-react';

interface Hit {
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

interface ExtractedPreview {
  name: string;
  description?: string;
  city?: string;
  country?: string;
  amenities?: string[];
  rooms?: Array<{ name: string; capacity?: number; basePrice?: number; currency?: string }>;
  photoUrls?: string[];
}

interface Props {
  defaultName?: string;
  onManualSetup: () => void;
  onSeeded: () => void;
}

/**
 * One-click setup card shown above the manual onboarding wizard when a
 * tenant has zero rooms. Three input modes:
 *   1. Search Google Places by name (fast, low detail)
 *   2. Paste a Booking.com link → Gemini extracts room types, photos,
 *      amenities, description via Google Search grounding
 *   3. Upload a screenshot of the Booking.com listing → Gemini Vision
 *      extracts the same shape from the image
 *
 * All three feed into /api/admin/seed/apply which writes Property + rooms
 * and flips the tenant into DRAFT mode for owner review before publish.
 */
export function QuickSetupCard({ defaultName = '', onManualSetup, onSeeded }: Props) {
  const router = useRouter();

  // ── Mode 1: Google Places search ─────────────────────────────────────
  const [query, setQuery] = useState(defaultName);
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [searched, setSearched] = useState(false);

  // ── Mode 2: Paste Booking.com link ───────────────────────────────────
  const [bookingUrl, setBookingUrl] = useState('');

  // ── Mode 3: Upload screenshot ────────────────────────────────────────
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  // ── Shared state ─────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState<ExtractedPreview | null>(null);

  async function searchByName() {
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
      setError(e?.message || 'Search failed. Try a different name or use Manual setup.');
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  async function applyHit(hit: Hit) {
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
          source: 'places',
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

  async function extractFromUrl() {
    if (!bookingUrl.trim()) return;
    if (!/booking\.com\/hotel/.test(bookingUrl)) {
      setError('Please paste a Booking.com hotel link (the URL contains /hotel/).');
      return;
    }
    setExtracting(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch('/api/admin/seed/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bookingUrl.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Extract failed');
      setPreview(j.extracted);
    } catch (e: any) {
      setError(
        e?.message ||
          "Couldn't read that listing. Try uploading a screenshot instead, or use Manual setup."
      );
    } finally {
      setExtracting(false);
    }
  }

  async function extractFromScreenshot() {
    if (!screenshotFile) return;
    setExtracting(true);
    setError(null);
    setPreview(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(screenshotFile);
      });
      const res = await fetch('/api/admin/seed/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: screenshotFile.type || 'image/jpeg',
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Extract failed');
      setPreview(j.extracted);
    } catch (e: any) {
      setError(e?.message || 'Could not read the screenshot. Try a clearer image or use Manual setup.');
    } finally {
      setExtracting(false);
    }
  }

  async function applyExtracted(source: 'url' | 'screenshot') {
    if (!preview) return;
    setApplying('extract');
    setError(null);
    try {
      const res = await fetch('/api/admin/seed/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preview.name,
          city: preview.city,
          country: preview.country,
          extracted: preview,
          source,
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
      <CardContent className="p-4 md:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-cyan-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              One-click setup
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-0.5">
              Pick the easiest path. We&apos;ll import your rooms and photos,
              you review and <span className="font-medium">Publish</span>.
            </p>
          </div>
        </div>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="link" className="text-xs gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Paste Booking link</span>
              <span className="sm:hidden">Link</span>
            </TabsTrigger>
            <TabsTrigger value="screenshot" className="text-xs gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Screenshot</span>
              <span className="sm:hidden">Photo</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs gap-1.5">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Find by name</span>
              <span className="sm:hidden">Name</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Paste Booking link ──────────────────────────────────── */}
          <TabsContent value="link" className="space-y-3 mt-3">
            <p className="text-xs text-gray-600">
              Open your listing on{' '}
              <a
                href="https://www.booking.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-700 underline"
              >
                Booking.com
              </a>
              , copy the URL from the address bar, and paste it below. We&apos;ll
              read room types, prices, amenities, and photos.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://www.booking.com/hotel/mv/your-guesthouse.html"
                className="flex-1 text-sm"
              />
              <Button
                onClick={extractFromUrl}
                disabled={extracting || !bookingUrl.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 gap-2"
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {extracting ? 'Reading…' : 'Read listing'}
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">
              Takes 10–30 seconds. We&apos;ll show you what we found before
              creating anything.
            </p>
          </TabsContent>

          {/* ── Upload screenshot ───────────────────────────────────── */}
          <TabsContent value="screenshot" className="space-y-3 mt-3">
            <p className="text-xs text-gray-600">
              On your phone, take a screenshot of your listing page (rooms,
              photos, amenities visible) and upload it here.
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
              className="block w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
            />
            {screenshotFile && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate flex-1">
                  {screenshotFile.name} ·{' '}
                  {(screenshotFile.size / 1024).toFixed(0)} KB
                </span>
                <Button
                  onClick={extractFromScreenshot}
                  disabled={extracting}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 gap-1.5"
                >
                  {extracting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {extracting ? 'Reading…' : 'Read screenshot'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── Search by name ──────────────────────────────────────── */}
          <TabsContent value="search" className="space-y-3 mt-3">
            <p className="text-xs text-gray-600">
              Don&apos;t have a Booking.com listing? Type your guesthouse name
              and we&apos;ll search Google to find it.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchByName()}
                placeholder="e.g. Rivethi Beach"
                className="flex-1"
              />
              <Button
                onClick={searchByName}
                disabled={searching || query.trim().length < 2}
                className="bg-cyan-600 hover:bg-cyan-700 gap-2"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {searching ? 'Searching…' : 'Find'}
              </Button>
            </div>

            {hits.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  Pick the one that matches:
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
                          onClick={() => applyHit(hit)}
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
                              That&apos;s mine
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
                No Maldives matches for{' '}
                <span className="font-medium">&ldquo;{query}&rdquo;</span>. Try
                a shorter name (e.g. just &ldquo;Rivethi&rdquo;) or set up
                manually.
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Extracted preview — shown after a successful URL or screenshot extract */}
        {preview && (
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {preview.name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {[preview.city, preview.country].filter(Boolean).join(', ')}
                </p>
              </div>
              {preview.photoUrls && preview.photoUrls.length > 0 && (
                <span className="text-[10px] text-gray-400 shrink-0">
                  {preview.photoUrls.length} photo{preview.photoUrls.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {preview.description && (
              <p className="text-xs text-gray-600 line-clamp-3">
                {preview.description}
              </p>
            )}
            {preview.rooms && preview.rooms.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-[11px] font-medium text-gray-700 mb-1">
                  {preview.rooms.length} room type{preview.rooms.length === 1 ? '' : 's'} found:
                </p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {preview.rooms.slice(0, 4).map((r, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{r.name}</span>
                      {r.basePrice ? (
                        <span className="text-gray-400 shrink-0">
                          {r.currency || ''} {r.basePrice}
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {preview.rooms.length > 4 && (
                    <li className="text-gray-400">+{preview.rooms.length - 4} more</li>
                  )}
                </ul>
              </div>
            )}
            {preview.amenities && preview.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preview.amenities.slice(0, 8).map((a) => (
                  <span
                    key={a}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview(null)}
                disabled={applying !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={() => applyExtracted(bookingUrl ? 'url' : 'screenshot')}
                disabled={applying !== null}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 gap-1.5"
              >
                {applying === 'extract' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Looks good — import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500">Prefer to fill it in by hand?</span>
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
