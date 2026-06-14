'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaymentProvider } from '@/lib/tenant-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export type BookingSource = 'stay_subdomain' | 'amaldives.com' | 'embed' | 'social';

interface BookingEngineProps {
  subdomain: string;
  tenantName: string;
  primaryColor?: string;
  source?: BookingSource;
  compact?: boolean;
  onSuccess?: (confirmation: string) => void;
}

type Step = 'search' | 'rooms' | 'guest' | 'pay' | 'done';

interface RoomOption {
  id: string;
  name: string;
  number: string;
  basePrice: number;
  totalPrice: number;
  nights: number;
}

export function BookingEngine({
  subdomain,
  tenantName,
  primaryColor = '#0d9488',
  source = 'stay_subdomain',
  compact = false,
  onSuccess,
}: BookingEngineProps) {
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState({ checkIn: '', checkOut: '', adults: 2 });
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);
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
  const [specialRequestsPolicy, setSpecialRequestsPolicy] = useState('');

  const apiBase = `/api/public/${subdomain}`;

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
        const policy = data?.property?.policies?.specialRequestsPolicy as string | undefined;
        if (policy) setSpecialRequestsPolicy(policy);
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
      setRooms(data.rooms ?? []);
      setStep('rooms');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [apiBase, search]);

  async function completeBooking() {
    if (!selectedRoom) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          adults: search.adults,
          guestName: guest.name,
          guestEmail: guest.email,
          guestPhone: guest.phone,
          specialRequests: guest.specialRequests,
          source,
          paymentMethod: payMode,
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
            <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
              ← Change dates
            </Button>
            {rooms.length === 0 ? (
              <p className="text-gray-600 text-sm">No rooms available for these dates.</p>
            ) : (
              rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoom(r);
                    setStep('guest');
                  }}
                  className="w-full text-left border rounded-lg p-4 hover:border-cyan-500 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{r.name || r.number}</p>
                      <p className="text-sm text-gray-500">
                        {r.nights} night{r.nights !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(r.totalPrice)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === 'guest' && selectedRoom && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('rooms')}>
              ← Choose another room
            </Button>
            <p className="text-sm font-medium">
              {selectedRoom.name} · {formatCurrency(selectedRoom.totalPrice)} total
            </p>
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
                <Label>Special requests</Label>
                <Input
                  value={guest.specialRequests}
                  onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })}
                  placeholder="Airport transfer, extra bed, baby cot, late check-out…"
                />
                {specialRequestsPolicy && (
                  <p className="text-xs text-amber-700 mt-1.5">{specialRequestsPolicy}</p>
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm booking'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
