'use client';

import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Save,
  Image as ImageIcon,
  Calendar,
  CheckCircle,
  ArrowRight,
  Lock,
  Hotel,
} from 'lucide-react';
import Image from 'next/image';

interface WebManagerProps {
  tenant: any;
  property: any;
  subdomain: string;
  plan: string;
  /** All Rooms for the tenant — used by the Channels tab to bind an
   *  iCal feed to a specific room. Optional so callers that don't show
   *  the channels tab don't have to fetch them. */
  allRooms?: Array<{ id: string; number: string; name: string | null; type: string }>;
  defaultTab?: string;
}

const COMMON_AMENITIES = [
  'Free WiFi', 'Air Conditioning', 'Swimming Pool', 'Snorkelling', 'Diving',
  'Restaurant', 'Bar', 'Room Service', 'Airport Transfer', 'Laundry',
  'Bicycle Rental', 'Water Sports', 'Beach Access', 'Sea View', 'Garden View',
  'Fishing Trips', 'Spa', 'Gym', 'Parking', '24-hour Reception',
];

function UpgradeBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
        <Lock className="h-6 w-6 text-amber-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Web & Distribution — Pro Feature</h3>
        <p className="text-sm text-gray-600 mt-1">
          Upgrade to the <strong>Web</strong> plan to edit your amaldives.com page, showcase your property,
          and get an iCal feed for Booking.com, Airbnb and other channels.
        </p>
      </div>
      <a
        href="mailto:hello@amaldives.com?subject=Upgrade%20to%20Web%20Plan"
        className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
      >
        Contact us to upgrade <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
      title="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function WebManager({ tenant, property, subdomain, plan, allRooms = [], defaultTab = 'profile' }: WebManagerProps) {
  const isLocked = plan === 'basic';
  const icalUrl = `https://stay.amaldives.com/api/public/${subdomain}/calendar.ics`;
  const amaldivesUrl = `https://www.amaldives.com/guesthouses/${tenant?.amaldivesSlug ?? subdomain}`;
  const stayUrl = `https://${subdomain}.stay.amaldives.com`;

  // Profile form state
  const [profile, setProfile] = useState({
    tenantName: tenant?.name ?? '',
    tenantDescription: tenant?.description ?? '',
    propertyName: property?.name ?? '',
    propertyDescription: property?.description ?? '',
    tagline: (property?.settings as any)?.webProfile?.tagline ?? '',
    propertyPhone: property?.phone ?? '',
    propertyEmail: property?.email ?? '',
    propertyWebsite: property?.website ?? '',
  });
  const [highlights, setHighlights] = useState<string[]>((property?.settings as any)?.webProfile?.highlights ?? []);
  const [amenities, setAmenities] = useState<string[]>(property?.amenities ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newHighlight, setNewHighlight] = useState('');

  // Photo state
  const [photos, setPhotos] = useState<string[]>(property?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // iCal test state
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  async function saveProfile() {
    setSaving(true);
    try {
      await fetch('/api/admin/web/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, highlights, amenities }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      // /api/admin/upload expects `files` (plural) and an optional `kind`
      // namespace; this caller used to send `file` (singular) so every
      // photo upload here silently failed with "No files provided".
      const fd = new FormData();
      fd.append('files', file);
      fd.append('kind', 'property');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const { urls } = await res.json();
        const newPhotos = [...photos, ...(urls ?? [])];
        setPhotos(newPhotos);
        await fetch('/api/admin/web/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: newPhotos }),
        });
      }
    } finally {
      setUploading(false);
    }
  }

  // ── Inbound iCal feeds (Booking.com / Airbnb / Vrbo subscriptions) ──
  // The Channels tab lets owners paste their per-room iCal URL so we
  // poll it every 15min via /api/cron/ical-sync and block those dates
  // in the availability calendar. Server keeps the source of truth;
  // this list is hydrated on demand.
  interface ExternalFeed {
    id: string;
    icalUrl: string;
    label: string;
    source: string;
    roomId: string | null;
    room?: { id: string; number: string; name: string | null } | null;
    isActive: boolean;
    lastSyncedAt: string | null;
    lastError: string | null;
    lastEventCount: number;
  }
  const [feeds, setFeeds] = useState<ExternalFeed[]>([]);
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const [newFeed, setNewFeed] = useState({ icalUrl: '', label: '', source: 'BOOKING_COM', roomId: '' });
  const [addingFeed, setAddingFeed] = useState(false);
  const [feedActionId, setFeedActionId] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  async function loadFeeds() {
    try {
      const res = await fetch('/api/admin/channels');
      if (res.ok) {
        const j = await res.json();
        setFeeds(j.feeds || []);
      }
    } finally {
      setFeedsLoaded(true);
    }
  }

  async function addFeed() {
    if (!newFeed.icalUrl.trim()) return;
    setAddingFeed(true);
    setFeedError(null);
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icalUrl: newFeed.icalUrl.trim(),
          label: newFeed.label.trim() || `${newFeed.source.replace('_', '.')} calendar`,
          source: newFeed.source,
          roomId: newFeed.roomId || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Add failed');
      setNewFeed({ icalUrl: '', label: '', source: 'BOOKING_COM', roomId: '' });
      await loadFeeds();
    } catch (e: any) {
      setFeedError(e?.message || 'Could not add feed');
    } finally {
      setAddingFeed(false);
    }
  }

  async function resyncFeed(id: string) {
    setFeedActionId(id);
    try {
      await fetch(`/api/admin/channels/${id}`, { method: 'PATCH' });
      await loadFeeds();
    } finally {
      setFeedActionId(null);
    }
  }

  async function removeFeed(id: string) {
    if (!confirm('Remove this feed? Blocks imported from it will be deleted.')) return;
    setFeedActionId(id);
    try {
      await fetch(`/api/admin/channels/${id}`, { method: 'DELETE' });
      await loadFeeds();
    } finally {
      setFeedActionId(null);
    }
  }

  // Lazy-load on first render of the Channels tab. We don't gate on the
  // tab being active so the count is fresh whenever the owner lands on
  // /admin/web?tab=channels from elsewhere.
  useEffect(() => {
    if (!feedsLoaded) loadFeeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Branding state — logo, hero, brand colors live in Tenant.theme JSON.
  const [branding, setBranding] = useState<{
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
    heroImageUrl: string;
  }>(() => {
    const theme = (tenant?.theme as any) ?? {};
    return {
      logoUrl: tenant?.logo ?? '',
      primaryColor: theme.primaryColor ?? '#0d9488',
      accentColor: theme.accentColor ?? '#2563eb',
      heroImageUrl: theme.heroImageUrl ?? '',
    };
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);

  async function uploadBrandingAsset(file: File, kind: 'logo' | 'hero'): Promise<string | null> {
    const fd = new FormData();
    fd.append('files', file);
    fd.append('kind', kind === 'logo' ? 'logos' : 'hero');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!res.ok) return null;
    const { urls } = await res.json();
    return urls?.[0] ?? null;
  }

  async function saveBranding() {
    setSavingBranding(true);
    try {
      await fetch('/api/admin/web/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantLogo: branding.logoUrl,
          primaryColor: branding.primaryColor,
          accentColor: branding.accentColor,
          heroImageUrl: branding.heroImageUrl,
        }),
      });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 3000);
    } finally {
      setSavingBranding(false);
    }
  }

  async function removePhoto(url: string) {
    const newPhotos = photos.filter((p) => p !== url);
    setPhotos(newPhotos);
    await fetch('/api/admin/web/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: newPhotos }),
    });
  }

  async function testIcal() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(icalUrl);
      if (!res.ok) { setTestResult('Error fetching iCal feed'); return; }
      const text = await res.text();
      const eventCount = (text.match(/BEGIN:VEVENT/g) ?? []).length;
      setTestResult(`Feed OK — ${eventCount} blocked date${eventCount !== 1 ? 's' : ''} found.`);
    } catch {
      setTestResult('Could not reach feed URL');
    } finally {
      setTestLoading(false);
    }
  }

  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  if (isLocked) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-600" /> Web & Distribution
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your amaldives.com page and channel manager sync</p>
        </div>
        <UpgradeBanner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-600" /> Web & Distribution
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit your amaldives.com page and set up channel manager sync</p>
        </div>
        <div className="flex gap-2">
          <a href={amaldivesUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> View on amaldives.com
            </Button>
          </a>
          <a href={stayUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Hotel className="h-3.5 w-3.5" /> Booking page
            </Button>
          </a>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="bg-white rounded-xl border overflow-hidden">
        <TabsList className="w-full rounded-none border-b bg-gray-50 h-10 flex-wrap">
          <TabsTrigger value="profile" className="flex-1 text-xs">Web Profile</TabsTrigger>
          <TabsTrigger value="branding" className="flex-1 text-xs">Branding</TabsTrigger>
          <TabsTrigger value="photos" className="flex-1 text-xs">Photos</TabsTrigger>
          <TabsTrigger value="rooms" className="flex-1 text-xs">Rooms & Rates</TabsTrigger>
          <TabsTrigger value="channels" className="flex-1 text-xs">Channel Manager</TabsTrigger>
        </TabsList>

        {/* Web Profile tab */}
        <TabsContent value="profile" className="m-0 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Display Name</label>
              <Input value={profile.tenantName} onChange={(e) => setProfile({ ...profile, tenantName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Tagline</label>
              <Input
                placeholder="e.g. Your peaceful island retreat in the Maldives"
                value={profile.tagline}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Property Description</label>
            <Textarea
              rows={4}
              placeholder="Describe your property for guests browsing amaldives.com..."
              value={profile.propertyDescription}
              onChange={(e) => setProfile({ ...profile, propertyDescription: e.target.value })}
            />
          </div>

          {/* Highlights */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">Highlights (bullet points on your page)</label>
            <div className="space-y-2 mb-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-teal-500 text-sm">•</span>
                  <Input
                    value={h}
                    onChange={(e) => setHighlights((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                    className="h-8 text-sm"
                  />
                  <button onClick={() => setHighlights((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a highlight..."
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newHighlight.trim()) {
                    setHighlights((prev) => [...prev, newHighlight.trim()]);
                    setNewHighlight('');
                  }
                }}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => {
                if (newHighlight.trim()) { setHighlights((prev) => [...prev, newHighlight.trim()]); setNewHighlight(''); }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
              <Input value={profile.propertyPhone} onChange={(e) => setProfile({ ...profile, propertyPhone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
              <Input value={profile.propertyEmail} onChange={(e) => setProfile({ ...profile, propertyEmail: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Website</label>
              <Input placeholder="https://" value={profile.propertyWebsite} onChange={(e) => setProfile({ ...profile, propertyWebsite: e.target.value })} />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    amenities.includes(a)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveProfile} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Saved!' : 'Save Profile'}
            </Button>
          </div>
        </TabsContent>

        {/* Branding tab — logo + colors + hero image. Applied on the
            public storefront and the admin sidebar. */}
        <TabsContent value="branding" className="m-0 p-5 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Your brand</h2>
            <p className="text-xs text-gray-500">
              These appear on your guest-facing booking page and in your admin sidebar.
              Defaults preserve the platform colors if you skip a field.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">Logo (square, &lt; 1 MB)</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                  {branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.logoUrl} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <Hotel className="h-6 w-6 text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="text-xs"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadBrandingAsset(f, 'logo');
                      if (url) setBranding({ ...branding, logoUrl: url });
                    }}
                  />
                  {branding.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setBranding({ ...branding, logoUrl: '' })}
                      className="text-[11px] text-red-500 hover:underline self-start"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Hero image */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">Hero banner (wide, &lt; 5 MB)</label>
              <div className="space-y-1.5">
                <div className="w-full h-24 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center">
                  {branding.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.heroImageUrl} alt="hero" className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="w-full h-full flex items-center justify-center text-white text-sm"
                      style={{
                        background: `linear-gradient(to right, ${branding.primaryColor}, ${branding.accentColor})`,
                      }}
                    >
                      Default gradient
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="text-xs"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await uploadBrandingAsset(f, 'hero');
                    if (url) setBranding({ ...branding, heroImageUrl: url });
                  }}
                />
                {branding.heroImageUrl && (
                  <button
                    type="button"
                    onClick={() => setBranding({ ...branding, heroImageUrl: '' })}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Remove hero image
                  </button>
                )}
              </div>
            </div>

            {/* Primary color */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">
                Primary color
                <span className="ml-2 text-[10px] text-gray-400 font-normal">buttons, prices, accents</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-12 h-9 rounded border cursor-pointer"
                />
                <Input
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="h-9 text-xs font-mono w-28"
                  placeholder="#0d9488"
                />
              </div>
            </div>

            {/* Accent color */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">
                Accent color
                <span className="ml-2 text-[10px] text-gray-400 font-normal">gradient end / highlights</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-12 h-9 rounded border cursor-pointer"
                />
                <Input
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="h-9 text-xs font-mono w-28"
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Preview</p>
            <div className="border rounded-lg overflow-hidden">
              <div
                className="h-32 relative flex items-end p-4"
                style={
                  branding.heroImageUrl
                    ? {
                        backgroundImage: `url(${branding.heroImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        backgroundImage: `linear-gradient(to right, ${branding.primaryColor}, ${branding.accentColor})`,
                      }
                }
              >
                <div className="absolute inset-0 bg-black/25" />
                <div className="relative flex items-center gap-2 text-white">
                  {branding.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.logoUrl} alt="logo" className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className="font-semibold">{profile.tenantName || 'Your guesthouse'}</span>
                </div>
              </div>
              <div className="p-3 flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded text-white"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  Book Now
                </button>
                <span
                  className="text-xs font-bold"
                  style={{ color: branding.primaryColor }}
                >
                  $85.00/night
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              onClick={saveBranding}
              disabled={savingBranding}
              size="sm"
              className="gap-2"
              style={{ backgroundColor: branding.primaryColor, color: 'white' }}
            >
              {savingBranding ? <Loader2 className="h-4 w-4 animate-spin" /> : brandingSaved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {brandingSaved ? 'Saved!' : 'Save Branding'}
            </Button>
          </div>
        </TabsContent>

        {/* Photos tab */}
        <TabsContent value="photos" className="m-0 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">{photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded</p>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); }}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Photo
              </Button>
            </div>
          </div>

          {photos.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-teal-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Click to upload your first property photo</p>
              <p className="text-xs text-gray-300 mt-1">These appear on your amaldives.com page</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((url, i) => (
                <div key={url} className="relative group rounded-lg overflow-hidden border aspect-video bg-gray-100">
                  <Image src={url} alt={`Property photo ${i + 1}`} fill className="object-cover" sizes="200px" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removePhoto(url)}
                      className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
                  )}
                </div>
              ))}
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg aspect-video flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Plus className="h-6 w-6 text-gray-300" />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Rooms & Rates tab */}
        <TabsContent value="rooms" className="m-0 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">Room types shown on amaldives.com. Manage rates in Rooms.</p>
            <a href="/admin/rooms">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                Manage Rooms <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
          {(property?.rooms ?? []).length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No rooms configured yet. Add rooms to display them on your page.
            </div>
          ) : (
            <div className="space-y-3">
              {(property?.rooms ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                  {r.images?.[0] ? (
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0">
                      <Image src={r.images[0]} alt={r.type} fill className="object-cover" sizes="80px" />
                    </div>
                  ) : (
                    <div className="w-20 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Hotel className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{r.type}</p>
                    <p className="text-xs text-gray-400">Sleeps {r.capacity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-teal-700">${r.basePrice}<span className="text-xs text-gray-400 font-normal">/night</span></p>
                    <Badge variant="outline" className="text-xs">Visible on page</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Channel Manager tab */}
        <TabsContent value="channels" className="m-0 p-5 space-y-6">
          {/* iCal feed */}
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-5 w-5 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Your iCal Availability Feed</h3>
              <Badge className="bg-teal-100 text-teal-700 border-teal-200">Auto-updates</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Paste this URL into Booking.com, Airbnb, Expedia or any channel manager. It stays live — whenever you get a booking in Stay, blocked dates update automatically.
            </p>
            <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2">
              <code className="text-xs text-gray-700 flex-1 break-all">{icalUrl}</code>
              <CopyButton text={icalUrl} />
              <a href={icalUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={testIcal} disabled={testLoading} className="gap-2">
                {testLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                Test Feed
              </Button>
              {testResult && (
                <span className={`text-xs ${testResult.startsWith('Feed OK') ? 'text-green-700' : 'text-red-600'}`}>
                  {testResult}
                </span>
              )}
            </div>
          </div>

          {/* Instructions by OTA */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-800">How to connect</h3>
            {[
              {
                name: 'Booking.com',
                steps: [
                  'Log in to your Booking.com Extranet',
                  'Go to Rates & Availability → Sync calendars',
                  'Select "Import from iCal" and paste the URL above',
                  'Booking.com will sync every 6–12 hours',
                ],
                color: 'text-blue-700',
                bg: 'bg-blue-50 border-blue-100',
              },
              {
                name: 'Airbnb',
                steps: [
                  'Go to your Airbnb listing → Calendar',
                  'Click "Availability settings" → Import Calendar',
                  'Paste the URL above and click Import',
                  'Airbnb syncs approximately every 2 hours',
                ],
                color: 'text-red-600',
                bg: 'bg-red-50 border-red-100',
              },
              {
                name: 'Expedia / Hotels.com',
                steps: [
                  'Log in to Expedia Partner Central',
                  'Go to Availability → Calendar Sync',
                  'Choose "iCalendar Import" and enter the URL',
                  'Sync frequency depends on your account settings',
                ],
                color: 'text-yellow-700',
                bg: 'bg-yellow-50 border-yellow-100',
              },
              {
                name: 'Channel Manager (Cloudbeds, Lodgify, etc.)',
                steps: [
                  'Find the "External calendar / iCal import" section',
                  'Paste the URL above as a blocked-dates feed',
                  'Most channel managers poll every 1–4 hours',
                  'Contact your CM support if you need help',
                ],
                color: 'text-gray-700',
                bg: 'bg-gray-50 border-gray-200',
              },
            ].map((ota) => (
              <div key={ota.name} className={`rounded-xl border p-4 ${ota.bg}`}>
                <h4 className={`font-semibold text-sm mb-2 ${ota.color}`}>{ota.name}</h4>
                <ol className="space-y-1">
                  {ota.steps.map((step, i) => (
                    <li key={i} className="text-xs text-gray-700 flex gap-2">
                      <span className="font-bold text-gray-400 shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          {/* Inbound iCal feeds — Booking.com / Airbnb URLs the owner
              gives us so we block dates from external bookings. Polled
              every 15 min by /api/cron/ical-sync. */}
          <div className="rounded-xl border bg-white p-4 md:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  Block dates from Booking.com / Airbnb
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paste the iCal URL each OTA gives you. We refresh every
                  15 minutes so guests can&apos;t double-book a date that&apos;s
                  already taken on Booking.com.
                </p>
              </div>
            </div>

            {/* Existing feeds */}
            {feeds.length > 0 ? (
              <div className="space-y-2">
                {feeds.map((f) => (
                  <div
                    key={f.id}
                    className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">
                        {f.label}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {f.source.replace('_', '.')} →{' '}
                        {f.room
                          ? `Room ${f.room.number}${f.room.name ? ` (${f.room.name})` : ''}`
                          : 'All rooms'}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {f.lastSyncedAt
                          ? `Last sync: ${new Date(f.lastSyncedAt).toLocaleString()} · ${f.lastEventCount} block${f.lastEventCount === 1 ? '' : 's'}`
                          : 'Not yet synced'}
                        {f.lastError ? (
                          <span className="text-red-500"> · {f.lastError}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={feedActionId === f.id}
                        onClick={() => resyncFeed(f.id)}
                      >
                        {feedActionId === f.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Sync now'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-red-600 hover:bg-red-50"
                        disabled={feedActionId === f.id}
                        onClick={() => removeFeed(f.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              feedsLoaded && (
                <p className="text-xs text-gray-500 italic">
                  No external feeds yet. Add one below to start blocking
                  Booking.com dates automatically.
                </p>
              )
            )}

            {/* Add new feed */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-[11px] font-medium text-gray-700">
                Add an iCal feed
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={newFeed.source}
                  onChange={(e) =>
                    setNewFeed({ ...newFeed, source: e.target.value })
                  }
                  className="border rounded px-2 py-1.5 text-xs h-9 bg-white"
                >
                  <option value="BOOKING_COM">Booking.com</option>
                  <option value="AIRBNB">Airbnb</option>
                  <option value="VRBO">Vrbo</option>
                  <option value="OTHER">Other</option>
                </select>
                <select
                  value={newFeed.roomId}
                  onChange={(e) =>
                    setNewFeed({ ...newFeed, roomId: e.target.value })
                  }
                  className="border rounded px-2 py-1.5 text-xs h-9 bg-white"
                >
                  <option value="">All rooms (property-wide)</option>
                  {allRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number}
                      {r.name ? ` — ${r.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="https://ical.booking.com/v1/export?t=…"
                value={newFeed.icalUrl}
                onChange={(e) =>
                  setNewFeed({ ...newFeed, icalUrl: e.target.value })
                }
                className="text-xs"
              />
              <Input
                placeholder='Label, e.g. "Booking.com — Deluxe Sea View"'
                value={newFeed.label}
                onChange={(e) =>
                  setNewFeed({ ...newFeed, label: e.target.value })
                }
                className="text-xs"
              />
              {feedError && (
                <div className="text-xs text-red-600">{feedError}</div>
              )}
              <Button
                size="sm"
                onClick={addFeed}
                disabled={addingFeed || !newFeed.icalUrl.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-xs gap-1.5"
              >
                {addingFeed ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                {addingFeed ? 'Adding…' : 'Add feed'}
              </Button>
              <p className="text-[10px] text-gray-400">
                On Booking.com: Calendar → Sync calendars → Export.
                On Airbnb: Listing → Calendar → Availability settings →
                Export calendar.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
