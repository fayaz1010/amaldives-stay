'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AgentOnboarding } from '@/components/agent/agent-onboarding';

export default function AgentPortalPage() {
  const [booting, setBooting] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [agency, setAgency] = useState<{ name: string; markupPercent: number } | null>(null);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<
    Array<{
      id: string;
      number: string;
      name: string;
      type: string;
      nights: number;
      agentTotal: number;
      rackTotal?: number;
      rackRate: number;
    }>
  >([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [booking, setBooking] = useState<{
    confirmationNumber: string;
    totalAmount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/agent/onboarding', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setAgency(data.agency);
          setShowOnboarding(!data.complete);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function search() {
    setLoading(true);
    setError(null);
    setRooms([]);
    setBooking(null);
    try {
      const url = new URL('/api/agent/book', window.location.origin);
      url.searchParams.set('checkIn', checkIn);
      url.searchParams.set('checkOut', checkOut);
      url.searchParams.set('adults', String(adults));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setRooms(data.rooms || []);
      setAgency(data.agency);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function book() {
    if (!selectedRoom) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom,
          checkIn,
          checkOut,
          adults,
          guestName,
          guestEmail,
          guestPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setBooking(data.booking);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (showOnboarding && agency) {
    return (
      <AgentOnboarding
        agencyName={agency.name}
        markupPercent={agency.markupPercent}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent booking portal</h1>
        {agency && (
          <p className="text-sm text-gray-500">
            {agency.name} · rack {agency.markupPercent >= 0 ? '+' : ''}{agency.markupPercent}%
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Check-in</Label>
          <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <Label>Check-out</Label>
          <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
      </div>
      <Button
        onClick={search}
        disabled={loading || !checkIn || !checkOut}
        className="bg-teal-600 hover:bg-teal-700"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search rates'}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {rooms.length > 0 && (
        <div className="space-y-2">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoom(r.id)}
              className={`w-full border rounded-lg p-3 text-left ${
                selectedRoom === r.id ? 'border-teal-500 bg-teal-50' : 'bg-white'
              }`}
            >
              <p className="font-medium">Room {r.number} — {r.name || r.type}</p>
              <p className="text-sm text-gray-600">
                Rack ${r.rackTotal?.toFixed(0) ?? (r.rackRate * r.nights).toFixed(0)} → Agent $
                {r.agentTotal.toFixed(0)}
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedRoom && (
        <div className="border rounded-lg p-4 space-y-3 bg-white">
          <h2 className="font-semibold">Guest details</h2>
          <Input placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          <Input placeholder="Guest email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
          <Input placeholder="Phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
          <Button
            onClick={book}
            disabled={loading || !guestName || !guestEmail}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            Confirm booking
          </Button>
        </div>
      )}

      {booking && (
        <div className="border border-green-500 bg-green-50 rounded-lg p-4">
          <p className="font-semibold text-green-800">Booked — {booking.confirmationNumber}</p>
          <p className="text-sm text-green-700">Total ${booking.totalAmount.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
