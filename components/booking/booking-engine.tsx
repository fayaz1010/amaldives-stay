'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaymentProvider } from '@/lib/tenant-settings';
import type { GuestExtraItem, PropertyGuestPolicies } from '@/lib/guest-extras';
import { summarizeAddonSelection } from '@/lib/booking-addons';
import type { PublicRoomOffer } from '@/lib/public-room-offers';
import { RoomOfferCard } from '@/components/booking/room-offer-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, CheckCircle2, Plane, BedDouble } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export type BookingSource = 'stay_subdomain' | 'amaldives.com' | 'embed' | 'social';

interface BookingEngineProps {
  subdomain: string;
  tenantName: string;
  primaryColor?: string;
  source?: BookingSource;
  compact?: boolean;
  onSuccess?: (confirmation: string) => void;
  /** Deep-link prefill (e.g. from an amaldives.com property page). */
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialRoomId?: string;
}

type Step = 'search' | 'rooms' | 'guest' | 'pay' | 'done';

export function BookingEngine({
  subdomain,
  tenantName,
  primaryColor = '#0d9488',
  source = 'stay_subdomain',
  compact = false,
  onSuccess,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialRoomId,
}: BookingEngineProps) {
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState({
    checkIn: initialCheckIn ?? '',
    checkOut: initialCheckOut ?? '',
    adults: initialAdults ?? 2,
  });
  const [offers, setOffers] = useState<PublicRoomOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<PublicRoomOffer | null>(null);
  const [guest, setGuest] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  });
  const [payMode, setPayMode] = useState<PaymentProvider>('stripe');
  const [enabledPayments, setEnabledPayments] = useState<PaymentProvider[]>([
    'stripe',
    'pay_at_property',
  ]);
  const [confirmation, setConfirmation] = useState('');
  const [extras, setExtras] = useState<GuestExtraItem[]>([]);
  const [policies, setPolicies] = useState<PropertyGuestPolicies>({});
  const [addonSelection, setAddonSelection] = useState<Record<string, number>>({});
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);

  const apiBase = `/api/public/${subdomain}`;

  const nights = selectedOffer?.nights ?? 0;

  const transfers = extras.filter((e) => e.category === 'TRANSFER');
  const addOns = extras.filter((e) => e.category === 'ADDON');

  const effectiveSelection = useMemo(() => {
    const sel: Record<string, number> = { ...addonSelection };
    for (const t of transfers) {
      sel[t.id] = selectedTransferId === t.id ? 1 : 0;
    }
    return sel;
  }, [addonSelection, selectedTransferId, transfers]);

  const { lines: addonLines, addonsTotal } = useMemo(
    () => summarizeAddonSelection(extras, effectiveSelection, nights),
    [extras, effectiveSelection, nights],
  );

  const roomTotal = selectedOffer?.totalPrice ?? 0;
  const grandTotal = roomTotal + addonsTotal;

  useEffect(() => {
    fetch(`${apiBase}/info`)
      .then((r) => r.json())
      .then((data) => {
        const list = data?.tenant?.payments?.enabledProviders as PaymentProvider[] | undefined;
        if (list?.length) {
          setEnabledPayments(list);
          const def = data.tenant.payments.defaultProvider as PaymentProvider;
          if (list.includes(def)) setPayMode(def);
          else setPayMode(list[0]);
        }
        if (Array.isArray(data.extras)) setExtras(data.extras);
        if (data?.property?.policies) setPolicies(data.property.policies);
      })
      .catch(() => {});
  }, [apiBase]);

  const searchRooms = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const q = new URLSearchParams({
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        adults: String(search.adults),
      });
      const res = await fetch(`${apiBase}/rooms?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load rooms');
      setOffers(data.offers ?? []);
      setStep('rooms');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [apiBase, search]);

  // Deep-link prefill (e.g. arriving from an amaldives.com property page with
  // dates + room already chosen): auto-run the availability search, then jump
  // straight to guest details for the chosen room — a near one-click handoff.
  const didAutoSearch = useRef(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(initialRoomId ?? null);
  useEffect(() => {
    if (didAutoSearch.current) return;
    if (initialCheckIn && initialCheckOut) {
      didAutoSearch.current = true;
      void searchRooms();
    }
  }, [initialCheckIn, initialCheckOut, searchRooms]);
  useEffect(() => {
    if (!pendingRoomId || step !== 'rooms' || offers.length === 0) return;
    const match = offers.find((o) => o.id === pendingRoomId);
    if (match) {
      setSelectedOffer(match);
      setStep('guest');
    }
    setPendingRoomId(null);
  }, [pendingRoomId, step, offers]);

  function buildAddonPayload() {
    return addonLines.map((line) => ({
      serviceId: line.serviceId,
      quantity: line.quantity,
    }));
  }

  async function completeBooking() {
    if (!selectedOffer) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedOffer.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          adults: search.adults,
          guestName: guest.name,
          guestEmail: guest.email,
          guestPhone: guest.phone,
          specialRequests: guest.specialRequests,
          source,
          paymentMethod: payMode,
          addonItems: buildAddonPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setConfirmation(data.booking?.confirmationNumber ?? '');
      setStep('done');
      onSuccess?.(data.booking?.confirmationNumber ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  function setAddonQty(serviceId: string, qty: number) {
    setAddonSelection((prev) => ({
      ...prev,
      [serviceId]: Math.max(0, Math.min(20, qty)),
    }));
  }

  if (step === 'done') {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        <CardContent className="pt-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
          <h3 className="text-xl font-bold">Booking confirmed!</h3>
          <p className="text-gray-600">
            Reference <span className="font-mono font-semibold">{confirmation}</span>
          </p>
          <p className="text-sm text-gray-500">
            A confirmation email will be sent to {guest.email}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'border-0 shadow-none' : 'bg-white/95 backdrop-blur-sm'}>
      {!compact && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Book {tenantName}</CardTitle>
          <CardDescription>Commission-free direct booking</CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {step === 'search' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchRooms();
            }}
            className="flex flex-col md:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <Label>Check-in</Label>
              <Input
                type="date"
                required
                value={search.checkIn}
                onChange={(e) => setSearch({ ...search, checkIn: e.target.value })}
              />
            </div>
            <div className="flex-1 w-full">
              <Label>Check-out</Label>
              <Input
                type="date"
                required
                value={search.checkOut}
                onChange={(e) => setSearch({ ...search, checkOut: e.target.value })}
              />
            </div>
            <div className="w-full md:w-28">
              <Label>Guests</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min={1}
                  max={12}
                  className="pl-9"
                  value={search.adults}
                  onChange={(e) =>
                    setSearch({ ...search, adults: parseInt(e.target.value, 10) || 1 })
                  }
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: primaryColor, color: '#fff' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
        )}

        {step === 'rooms' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
                ← Change dates
              </Button>
              <p className="text-xs text-gray-500">
                {offers.length} room type{offers.length !== 1 ? 's' : ''} available
              </p>
            </div>
            {offers.length === 0 ? (
              <p className="text-gray-600 text-sm">No rooms available for these dates.</p>
            ) : (
              <div
                className={`space-y-3 ${compact ? 'max-h-[min(70vh,520px)] overflow-y-auto pr-1' : ''}`}
              >
                {offers.map((offer) => (
                  <RoomOfferCard
                    key={offer.id}
                    offer={offer}
                    primaryColor={primaryColor}
                    compact={compact}
                    selected={selectedOffer?.id === offer.id}
                    onSelect={() => {
                      setSelectedOffer(offer);
                      setStep('guest');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'guest' && selectedOffer && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('rooms')}>
              ← Choose another room
            </Button>

            <div className="rounded-lg border bg-white p-3">
              {compact ? (
                <div className="flex justify-between items-start gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedOffer.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedOffer.nights} nights · up to {selectedOffer.capacity} guests
                    </p>
                  </div>
                  <p className="font-bold shrink-0" style={{ color: primaryColor }}>
                    {formatCurrency(selectedOffer.totalPrice)}
                  </p>
                </div>
              ) : (
                <RoomOfferCard
                  offer={selectedOffer}
                  primaryColor={primaryColor}
                  compact={compact}
                  selected
                  onSelect={() => setStep('rooms')}
                />
              )}
            </div>

            <div className="rounded-lg border bg-gray-50 p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-800">
                <span>Room · {nights} night{nights !== 1 ? 's' : ''}</span>
                <span className="font-medium">{formatCurrency(roomTotal)}</span>
              </div>
              {addonLines.length > 0 && (
                <p className="text-xs uppercase tracking-wide text-gray-500 pt-2 pb-1">Add-ons</p>
              )}
              {addonLines.map((line) => (
                <div key={line.serviceId} className="flex justify-between text-gray-600">
                  <span className="truncate pr-2">
                    {line.name}
                    {line.unit === 'per night' && ` × ${line.quantity} × ${nights}n`}
                    {line.unit === 'per hour' && ` × ${line.quantity}h`}
                  </span>
                  <span>{formatCurrency(line.totalAmount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total</span>
                <span style={{ color: primaryColor }}>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {transfers.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Plane className="h-4 w-4" /> Airport transfer (optional)
                </Label>
                <div className="space-y-2 border rounded-lg p-3 bg-white">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="transfer"
                      checked={selectedTransferId === null}
                      onChange={() => setSelectedTransferId(null)}
                    />
                    No airport transfer
                  </label>
                  {transfers.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="transfer"
                          checked={selectedTransferId === t.id}
                          onChange={() => setSelectedTransferId(t.id)}
                        />
                        {t.name.replace(/^Airport Transfer — /, '')}
                      </span>
                      <span className="font-semibold shrink-0">{formatCurrency(t.price)}</span>
                    </label>
                  ))}
                </div>
                {policies.airportTransferPickupNotice && (
                  <p className="text-xs text-gray-500">{policies.airportTransferPickupNotice}</p>
                )}
              </div>
            )}

            {addOns.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4" /> Room add-ons (optional)
                </Label>
                <div className="space-y-3 border rounded-lg p-3 bg-white">
                  {addOns.map((item) => {
                    const qty = addonSelection[item.id] ?? 0;
                    const isPerNight = item.unit === 'per night';
                    const isPerHour = item.unit === 'per hour';
                    const lineTotal = summarizeAddonSelection(
                      [item],
                      { [item.id]: qty },
                      nights,
                    ).addonsTotal;

                    return (
                      <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.price)}
                            {isPerNight && ' per night'}
                            {isPerHour && ' per hour'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPerHour ? (
                            <Input
                              type="number"
                              min={0}
                              max={12}
                              className="w-20 h-9"
                              value={qty || ''}
                              placeholder="0"
                              onChange={(e) =>
                                setAddonQty(item.id, parseInt(e.target.value, 10) || 0)
                              }
                            />
                          ) : (
                            <select
                              className="border rounded-md h-9 px-2 text-sm"
                              value={qty}
                              onChange={(e) => setAddonQty(item.id, parseInt(e.target.value, 10))}
                            >
                              <option value={0}>None</option>
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                            </select>
                          )}
                          {qty > 0 && (
                            <span className="text-sm font-semibold text-gray-700">
                              {formatCurrency(lineTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-3">
              <div>
                <Label>Full name</Label>
                <Input
                  required
                  value={guest.name}
                  onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={guest.email}
                  onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone (WhatsApp)</Label>
                <Input
                  value={guest.phone}
                  onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Other special requests</Label>
                <Input
                  value={guest.specialRequests}
                  onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })}
                  placeholder="Dietary needs, arrival time, etc."
                />
                {policies.specialRequestsPolicy && (
                  <p className="text-xs text-amber-700 mt-1.5">{policies.specialRequestsPolicy}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Payment</Label>
              <div className="flex flex-wrap gap-2">
                {enabledPayments.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={payMode === m ? 'default' : 'outline'}
                    onClick={() => setPayMode(m)}
                    style={
                      payMode === m ? { backgroundColor: primaryColor, color: '#fff' } : undefined
                    }
                  >
                    {m === 'stripe'
                      ? 'Card (Stripe)'
                      : m === 'maya'
                        ? 'Maya'
                        : m === 'bml_connect'
                          ? 'BML Connect'
                          : 'Pay at property'}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              disabled={loading}
              onClick={completeBooking}
              style={{ backgroundColor: primaryColor, color: '#fff' }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Confirm booking · ${formatCurrency(grandTotal)}`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
