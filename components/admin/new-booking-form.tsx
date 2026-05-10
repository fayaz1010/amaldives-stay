'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Users, Bed, Calendar } from 'lucide-react';

type RoomResult = {
  id: string;
  number: string;
  type: string;
  capacity: number;
  basePrice: number;
  description?: string | null;
  amenities: string[];
  images: string[];
  property: { id: string; name: string; city: string; country: string };
  nights: number;
  totalPrice: number;
};

interface Props {
  propertyId: string;
  tenantSubdomain: string;
}

const PLATFORM_FEE_RATE = 0.04;

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function NewBookingForm({ propertyId, tenantSubdomain }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [checkInDate, setCheckInDate] = useState(todayPlus(1));
  const [checkOutDate, setCheckOutDate] = useState(todayPlus(2));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomResult[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomResult | null>(null);

  // Step 2
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 3
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nights = useMemo(() => {
    const a = new Date(checkInDate);
    const b = new Date(checkOutDate);
    return Math.max(
      1,
      Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [checkInDate, checkOutDate]);

  const totalAmount = selectedRoom ? selectedRoom.totalPrice : 0;
  const platformFee = totalAmount * PLATFORM_FEE_RATE;

  async function checkAvailability() {
    setSearching(true);
    setSearchError(null);
    setRooms([]);
    setSelectedRoom(null);
    try {
      const url = new URL(
        `/api/public/${encodeURIComponent(tenantSubdomain)}/rooms`,
        window.location.origin
      );
      url.searchParams.set('checkIn', checkInDate);
      url.searchParams.set('checkOut', checkOutDate);
      url.searchParams.set('adults', String(adults));
      const res = await fetch(url.toString());
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to load availability');
      setRooms(j.rooms || []);
      if ((j.rooms || []).length === 0) {
        setSearchError('No rooms available for these dates.');
      }
    } catch (e: any) {
      setSearchError(e?.message || 'Failed to load availability');
    } finally {
      setSearching(false);
    }
  }

  function selectRoom(room: RoomResult) {
    setSelectedRoom(room);
    setStep(2);
  }

  function step2Valid() {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      /.+@.+\..+/.test(email) &&
      phone.trim().length > 0
    );
  }

  async function confirmBooking() {
    if (!selectedRoom) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          propertyId,
          checkInDate,
          checkOutDate,
          adults,
          children,
          totalAmount,
          status: 'CONFIRMED',
          source: 'DIRECT',
          guestData: {
            name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            nationality: nationality.trim() || undefined,
            idNumber: idNumber.trim() || undefined,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.error || 'Failed to create booking');
      }
      router.push('/admin/reservations');
      router.refresh();
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Stepper step={step} />

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-600" />
              Dates & guests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="checkIn">Check-in</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="checkOut">Check-out</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="adults">Adults</Label>
                <Input
                  id="adults"
                  type="number"
                  min={1}
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="children">Children</Label>
                <Input
                  id="children"
                  type="number"
                  min={0}
                  value={children}
                  onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <Button
              onClick={checkAvailability}
              disabled={searching}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                'Check Availability'
              )}
            </Button>

            {searchError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchError}
              </div>
            )}

            {rooms.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  {rooms.length} room{rooms.length === 1 ? '' : 's'} available · {nights} night
                  {nights === 1 ? '' : 's'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => selectRoom(room)}
                      className="text-left rounded-lg border border-gray-200 p-4 hover:border-cyan-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">
                            Room {room.number}{' '}
                            <span className="text-xs text-gray-500 font-normal">
                              ({room.type})
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3" /> Sleeps {room.capacity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-cyan-700 font-semibold">
                            ${room.basePrice.toFixed(2)}
                            <span className="text-xs text-gray-500 font-normal">
                              {' '}
                              /night
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            ${room.totalPrice.toFixed(2)} total
                          </p>
                        </div>
                      </div>
                      {room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.amenities.slice(0, 4).map((a) => (
                            <span
                              key={a}
                              className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5"
                            >
                              {a}
                            </span>
                          ))}
                          {room.amenities.length > 4 && (
                            <span className="text-xs text-gray-400">
                              +{room.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              Guest details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="idNumber">ID / Passport number</Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="specialRequests">Special requests</Label>
              <Textarea
                id="specialRequests"
                rows={3}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Allergies, arrival time, accessibility, etc."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!step2Valid()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-cyan-600" />
              Review & confirm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-1">
                    <Bed className="h-3 w-3" /> Room
                  </div>
                  <p className="font-medium">
                    Room {selectedRoom.number} ({selectedRoom.type})
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  ${selectedRoom.basePrice.toFixed(2)} / night
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Check-in
                  </p>
                  <p className="font-medium">
                    {new Date(checkInDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Check-out
                  </p>
                  <p className="font-medium">
                    {new Date(checkOutDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Nights
                  </p>
                  <p className="font-medium">{nights}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Adults
                  </p>
                  <p className="font-medium">{adults}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Children
                  </p>
                  <p className="font-medium">{children}</p>
                </div>
              </div>
              <div className="border-t pt-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Guest
                </p>
                <p className="font-medium">
                  {firstName} {lastName}
                </p>
                <p className="text-gray-600">{email}</p>
                <p className="text-gray-600">{phone}</p>
                {(nationality || idNumber) && (
                  <p className="text-gray-500 text-xs mt-1">
                    {nationality && <>Nationality: {nationality}</>}
                    {nationality && idNumber && <> · </>}
                    {idNumber && <>ID: {idNumber}</>}
                  </p>
                )}
                {specialRequests && (
                  <p className="text-gray-600 mt-2">
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">
                      Special requests
                    </span>
                    {specialRequests}
                  </p>
                )}
              </div>
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    Subtotal ({nights} night{nights === 1 ? '' : 's'})
                  </span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500 text-xs">
                  <span>Platform fee (4%)</span>
                  <span>${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-base pt-1">
                  <span>Total</span>
                  <span className="text-cyan-700">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                Back
              </Button>
              <Button
                onClick={confirmBooking}
                disabled={submitting}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Dates & Room' },
    { n: 2, label: 'Guest Info' },
    { n: 3, label: 'Confirm' },
  ];
  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 ${
                active ? 'text-cyan-700' : done ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  active
                    ? 'bg-cyan-600 text-white'
                    : done
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 mx-3 h-px ${
                  step > s.n ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
