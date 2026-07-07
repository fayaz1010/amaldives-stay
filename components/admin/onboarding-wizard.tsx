'use client';

import { useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import {
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Copy,
  Share2,
  CalendarPlus,
  PlaneLanding,
  Globe,
  Plus,
  Trash2,
  Loader2,
  Tag,
  Users,
  CreditCard,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OnboardingPaymentsStep } from '@/components/admin/onboarding-payments-step';
import {
  getPaymentsConfig,
  type PaymentProvider,
  type TenantPaymentsConfig,
} from '@/lib/tenant-settings';

interface Props {
  propertyName: string;
  subdomain: string;
  propertyId?: string;
  stripePlatformConfigured?: boolean;
  tenantSettings?: unknown;
  otaIngestDomain?: string | null;
  onComplete: () => void;
}

const ROOM_CATEGORIES = ['STANDARD', 'DELUXE', 'SUITE', 'FAMILY'] as const;
type RoomCategory = (typeof ROOM_CATEGORIES)[number];

interface RoomTypeDraft {
  name: string;
  type: RoomCategory;
  basePrice: string;
  rackPrice: string;
  maxGuests: string;
  roomNumbers: string;
}

const emptyRoomType = (): RoomTypeDraft => ({
  name: '',
  type: 'STANDARD',
  basePrice: '',
  rackPrice: '',
  maxGuests: '2',
  roomNumbers: '',
});

const CONFETTI_COLORS = ['#0d9488', '#facc15', '#ec4899', '#a855f7', '#f97316'];
const TOTAL_STEPS = 9;

export function OnboardingWizard({
  propertyName,
  subdomain,
  propertyId,
  stripePlatformConfigured = false,
  tenantSettings,
  otaIngestDomain = null,
  onComplete,
}: Props) {
  const initialPayments = getPaymentsConfig(tenantSettings);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [otaEmailCopied, setOtaEmailCopied] = useState(false);

  const [name, setName] = useState(propertyName ?? '');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [roomTypes, setRoomTypes] = useState<RoomTypeDraft[]>([emptyRoomType()]);

  const [currency, setCurrency] = useState<'USD' | 'MVR'>(initialPayments.currency ?? 'USD');
  const [stripeEnabled, setStripeEnabled] = useState(
    stripePlatformConfigured && (initialPayments.enabledProviders?.includes('stripe') ?? true),
  );
  const [payAtProperty, setPayAtProperty] = useState(
    initialPayments.enabledProviders?.includes('pay_at_property') ?? true,
  );

  const bookingUrl = `https://${subdomain}.vayves.com/`;
  const amaldivesListingUrl = `https://www.amaldives.com/guesthouses/${subdomain}`;
  const otaIngestEmail = otaIngestDomain ? `ota-${subdomain}@${otaIngestDomain}` : null;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(bookingUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Book your stay at ${name || propertyName} — ${bookingUrl}`,
  )}`;

  const confetti = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 30,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.4,
        rotate: Math.random() * 360,
      })),
    [],
  );

  const progressPct = (step / TOTAL_STEPS) * 100;

  const updateRoomType = (idx: number, patch: Partial<RoomTypeDraft>) => {
    setRoomTypes((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRoomType = () => {
    if (roomTypes.length >= 3) return;
    setRoomTypes((prev) => [...prev, emptyRoomType()]);
  };

  const removeRoomType = (idx: number) => {
    setRoomTypes((prev) => prev.filter((_, i) => i !== idx));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const saveDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tagline, city, phone, email }),
      });
      if (!res.ok) throw new Error('Could not save property details.');
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save details');
    } finally {
      setLoading(false);
    }
  };

  const createRooms = async () => {
    for (let i = 0; i < roomTypes.length; i++) {
      const rt = roomTypes[i];
      if (!rt.name.trim()) return setError(`Room type ${i + 1}: name is required.`);
      const price = Number(rt.basePrice);
      if (!rt.basePrice || Number.isNaN(price) || price < 0)
        return setError(`Room type ${i + 1}: enter a valid sell price.`);
      const rack = rt.rackPrice.trim() ? Number(rt.rackPrice) : price;
      if (Number.isNaN(rack) || rack < 0)
        return setError(`Room type ${i + 1}: enter a valid rack price.`);
      const cap = Number(rt.maxGuests);
      if (!rt.maxGuests || Number.isNaN(cap) || cap < 1)
        return setError(`Room type ${i + 1}: enter max guests.`);
      const numbers = rt.roomNumbers.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
      if (numbers.length === 0)
        return setError(`Room type ${i + 1}: add at least one room number.`);
    }

    setLoading(true);
    setError(null);
    try {
      let createdAny = false;
      for (const rt of roomTypes) {
        const numbers = rt.roomNumbers.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
        const rack = rt.rackPrice.trim() ? Number(rt.rackPrice) : Number(rt.basePrice);
        for (const number of numbers) {
          const res = await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(propertyId ? { propertyId } : {}),
              name: rt.name.trim(),
              type: rt.type,
              basePrice: Number(rt.basePrice),
              rackRate: rack,
              capacity: Number(rt.maxGuests),
              number,
              amenities: [],
              images: [],
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Failed to create room ${number}`);
          }
          createdAny = true;
        }
      }
      if (!createdAny) throw new Error('No rooms were created.');
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create rooms');
    } finally {
      setLoading(false);
    }
  };

  const savePayments = async () => {
    setLoading(true);
    setError(null);
    const enabledProviders: PaymentProvider[] = [];
    if (stripeEnabled) enabledProviders.push('stripe');
    if (payAtProperty) enabledProviders.push('pay_at_property');
    if (!enabledProviders.length) enabledProviders.push('pay_at_property');

    const payments: TenantPaymentsConfig = {
      currency,
      defaultProvider: stripeEnabled ? 'stripe' : 'pay_at_property',
      enabledProviders,
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { payments } }),
      });
      if (!res.ok) throw new Error('Could not save payment settings.');
      setStep(5);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save payments');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const copyOtaEmail = async () => {
    if (!otaIngestEmail) return;
    try {
      await navigator.clipboard.writeText(otaIngestEmail);
      setOtaEmailCopied(true);
      setTimeout(() => setOtaEmailCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const finish = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingComplete: true }),
      });
    } catch {
      // best-effort
    } finally {
      setLoading(false);
      onComplete();
    }
  };

  const navButtons = (onNext: () => void, nextLabel = 'Next') => (
    <div className="flex gap-3 pt-2">
      <Button variant="outline" className="min-h-12 flex-1" onClick={goBack} disabled={loading}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Button
        className="min-h-12 flex-1 bg-teal-500 hover:bg-teal-600 text-white"
        onClick={onNext}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>{nextLabel} <ArrowRight className="ml-2 h-4 w-4" /></>
        )}
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <style>{`
        @keyframes onbStepIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onbConfetti {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .onb-step { animation: onbStepIn 240ms ease-out both; }
        .onb-confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation-name: onbConfetti;
          animation-timing-function: ease-in;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
      `}</style>

      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="onb-step text-center space-y-6 py-8">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Building2 className="h-10 w-10 text-teal-600" />
            </div>
            <h1 className="text-3xl font-bold text-teal-600">Welcome to Vayves!</h1>
            <p className="text-gray-600">
              Set up rooms, Stripe payments, and your amaldives.com listing in about 10 minutes.
            </p>
            <Button
              className="w-full min-h-12 bg-teal-500 hover:bg-teal-600 text-white text-base"
              onClick={() => setStep(2)}
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="onb-step space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">Tell us about your property</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="onb-name">Display Name</Label>
                <Input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-12" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-tagline">Short tagline</Label>
                <Input id="onb-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="min-h-12" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onb-city">Island / City</Label>
                <Input id="onb-city" value={city} onChange={(e) => setCity(e.target.value)} className="min-h-12" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-phone">Phone</Label>
                  <Input id="onb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-12" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-email">Email</Label>
                  <Input id="onb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12" />
                </div>
              </div>
            </div>
            {navButtons(saveDetails)}
          </div>
        )}

        {step === 3 && (
          <div key="s3" className="onb-step space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">Rooms & rates</h2>
            <p className="text-sm text-gray-500">
              <strong>Sell price</strong> is what guests pay. <strong>Rack</strong> is your published card rate (used for
              agent B2B and promotion discounts).
            </p>
            <div className="space-y-4">
              {roomTypes.map((rt, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/40">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Room type {idx + 1}</p>
                    {roomTypes.length > 1 && (
                      <button type="button" onClick={() => removeRoomType(idx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Room type name</Label>
                    <Input value={rt.name} onChange={(e) => updateRoomType(idx, { name: e.target.value })} className="min-h-12" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={rt.type} onValueChange={(v) => updateRoomType(idx, { type: v as RoomCategory })}>
                        <SelectTrigger className="min-h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROOM_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max guests</Label>
                      <Input type="number" min="1" value={rt.maxGuests} onChange={(e) => updateRoomType(idx, { maxGuests: e.target.value })} className="min-h-12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Sell / night (USD)</Label>
                      <Input type="number" min="0" value={rt.basePrice} onChange={(e) => updateRoomType(idx, { basePrice: e.target.value })} className="min-h-12" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rack / night (USD)</Label>
                      <Input type="number" min="0" value={rt.rackPrice} onChange={(e) => updateRoomType(idx, { rackPrice: e.target.value })} placeholder="Same as sell" className="min-h-12" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Room numbers</Label>
                    <Textarea value={rt.roomNumbers} onChange={(e) => updateRoomType(idx, { roomNumbers: e.target.value })} placeholder={'101\n102'} rows={3} />
                  </div>
                </div>
              ))}
              {roomTypes.length < 3 && (
                <Button type="button" variant="outline" className="w-full min-h-12" onClick={addRoomType}>
                  <Plus className="mr-2 h-4 w-4" /> Add another room type
                </Button>
              )}
            </div>
            {navButtons(createRooms)}
          </div>
        )}

        {step === 4 && (
          <div key="s4" className="onb-step space-y-5">
            <OnboardingPaymentsStep
              stripePlatformConfigured={stripePlatformConfigured}
              stripeEnabled={stripeEnabled}
              payAtProperty={payAtProperty}
              currency={currency}
              onStripeEnabled={setStripeEnabled}
              onPayAtProperty={setPayAtProperty}
              onCurrency={setCurrency}
            />
            {navButtons(savePayments, 'Save & continue')}
          </div>
        )}

        {step === 5 && (
          <div key="s5" className="onb-step space-y-5">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-teal-600" />
              amaldives.com distribution
            </h2>
            <div className="rounded-lg border bg-teal-50 border-teal-200 p-4 text-sm text-teal-900 space-y-2">
              <p><strong>10%</strong> platform fee when guests book from your amaldives.com listing (STAY-live properties).</p>
              <p><strong>4%</strong> when they book direct on <code className="bg-white/60 px-1 rounded">{subdomain}.vayves.com</code>.</p>
              <p className="text-xs text-teal-800">Booking.com and other OTAs typically charge 18%+ — STAY keeps more revenue with you.</p>
            </div>
            <p className="text-sm text-gray-600 break-all">
              Listing: <a href={amaldivesListingUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">{amaldivesListingUrl}</a>
            </p>
            {navButtons(() => setStep(6))}
          </div>
        )}

        {step === 6 && (
          <div key="s6" className="onb-step space-y-5">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-teal-600" />
              Connect your booking channels
            </h2>
            <p className="text-sm text-gray-600">
              Already listed on Booking.com, Airbnb, Agoda or others? Get their reservations pushed straight into
              STAY — automatically, verified by AI — so nothing is ever double-booked or missed.
            </p>
            {otaIngestEmail ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Your private auto-import address</p>
                <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2">
                  <code className="text-xs text-gray-700 flex-1 break-all">{otaIngestEmail}</code>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={copyOtaEmail}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {otaEmailCopied && <p className="text-xs text-emerald-700">Copied!</p>}
                <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-800">Easiest setup (1 minute, covers every OTA):</p>
                  <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                    <li>Open the inbox where your OTAs already email you</li>
                    <li>Add a filter that forwards mail from Booking.com/Airbnb/Agoda/Expedia to the address above</li>
                    <li>Done — new reservations start appearing in STAY automatically</li>
                  </ol>
                </div>
                <p className="text-xs text-gray-500">
                  Full instructions and per-OTA options are in <strong>Web & Distribution → Channel Manager</strong>{' '}
                  anytime — this step is just to get the address in your hands early.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border p-4 bg-gray-50 text-sm text-gray-700">
                You can set this up anytime from <strong>Web & Distribution → Channel Manager</strong> — including
                iCal calendar sync to block dates from other OTAs.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="min-h-12 flex-1" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="min-h-12 flex-1 bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setStep(7)}>
                {otaIngestEmail ? "I'll do this now / later" : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div key="s7" className="onb-step space-y-5">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-teal-600" />
              Travel agents (optional)
            </h2>
            <p className="text-sm text-gray-600">
              Invite travel agencies to book at rack ± contracted markup. You can add agencies anytime from
              <strong> Rooms → Travel agents</strong> in the admin.
            </p>
            <div className="rounded-lg border p-4 bg-gray-50 text-sm text-gray-700 space-y-2">
              <p className="flex items-center gap-2"><Tag className="h-4 w-4 text-teal-600" /> Set promotions under <strong>Promotions</strong></p>
              <p className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-teal-600" /> Fine-tune Maya/BML in <strong>Settings → Payments</strong></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="min-h-12 flex-1" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="min-h-12 flex-1 bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setStep(8)}>
                Skip for now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div key="s8" className="onb-step space-y-5 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Your booking page is ready!</h2>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono break-all text-gray-700">
              {bookingUrl}
            </div>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR" width={160} height={160} className="rounded-lg border bg-white p-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="min-h-12" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md min-h-12 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4">
                <Share2 className="mr-2 h-4 w-4" /> WhatsApp
              </a>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="min-h-12 flex-1" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="min-h-12 flex-1 bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setStep(9)}>
                Finish <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 9 && (
          <div key="s9" className="onb-step text-center space-y-6 relative">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confetti.map((c, i) => (
                <span
                  key={i}
                  className="onb-confetti-piece"
                  style={{
                    left: `${c.left}%`,
                    top: `${c.top}%`,
                    backgroundColor: c.color,
                    transform: `rotate(${c.rotate}deg)`,
                    animationDelay: `${c.delay}s`,
                    animationDuration: `${c.duration}s`,
                  }}
                />
              ))}
            </div>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-teal-600">You are all set!</h1>
            <div className="grid grid-cols-2 gap-3 text-left">
              <NextStepCard href="/admin/reservations/new" icon={CalendarPlus} title="Create booking" />
              <NextStepCard href="/admin/web?tab=channels" icon={Mail} title="Connect OTAs" />
              <NextStepCard href="/admin/promotions" icon={Tag} title="Promotions" />
              <NextStepCard href="/admin/agencies" icon={Users} title="Travel agents" />
              <NextStepCard href="/admin/settings/payments" icon={CreditCard} title="Payments" />
            </div>
            <Button className="w-full min-h-12 bg-teal-500 hover:bg-teal-600 text-white" onClick={finish} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go to Dashboard'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NextStepCard({ href, icon: Icon, title }: { href: string; icon: ComponentType<{ className?: string }>; title: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-gray-200 p-3 hover:border-teal-400 hover:shadow-sm transition">
      <Icon className="h-5 w-5 text-teal-600 mb-2" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </Link>
  );
}

export default OnboardingWizard;
