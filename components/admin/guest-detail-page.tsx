'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Globe,
  Star,
  Hotel,
  Beer,
  Waves,
  Plane,
  DollarSign,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const loyaltyColors: Record<string, string> = {
  STANDARD: 'bg-gray-200 text-gray-800',
  SILVER: 'bg-slate-300 text-slate-900',
  GOLD: 'bg-yellow-200 text-yellow-900',
  PLATINUM: 'bg-purple-200 text-purple-900',
};

const bookingStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CHECKED_IN: 'bg-blue-100 text-blue-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

const minibarStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ON_BILL: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  WAIVED: 'bg-gray-200 text-gray-700',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-200 text-gray-700',
};

const serviceStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const arrivalStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  AT_JETTY: 'bg-indigo-100 text-indigo-800',
  AT_PROPERTY: 'bg-cyan-100 text-cyan-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
};

const departureStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  AT_JETTY: 'bg-indigo-100 text-indigo-800',
  DEPARTED: 'bg-green-100 text-green-800',
};

const categoryEmoji: Record<string, string> = {
  EXCURSION: '🌴',
  SPA: '💆',
  DIVING: '🤿',
  WATERSPORTS: '🏄',
  TRANSPORT: '🚤',
  FOOD: '🍽️',
  LAUNDRY: '🧺',
  RENTAL: '🎒',
};

function fmtDate(d: any) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function fmtDateTime(d: any) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function nightsBetween(from: any, to: any) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

function money(n: number) {
  return `$${(n || 0).toFixed(2)}`;
}

function StatusBadge({ value, map }: { value: string; map: Record<string, string> }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[value] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {value}
    </span>
  );
}

export function GuestDetailPage({ guest: initial }: { guest: any }) {
  const router = useRouter();
  const [guest, setGuest] = useState<any>(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const profile = guest.guestProfile || {};
  const bookings: any[] = guest.bookings || [];

  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    guest.name ||
    'Unnamed Guest';
  const loyaltyTier: string = profile.loyaltyTier || 'STANDARD';

  const totalStays = bookings.length;
  const totalSpent = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const avgSpend = totalStays > 0 ? totalSpent / totalStays : 0;

  const activeBooking = bookings.find((b) => b.status === 'CHECKED_IN') || null;
  const recentBookings = bookings.slice(0, 3);

  const allMiniBar = useMemo(
    () =>
      bookings.flatMap((b) =>
        (b.minIBarUsages || []).map((u: any) => ({
          ...u,
          bookingRef: b.confirmationNumber,
          roomNumber: b.room?.number,
        })),
      ),
    [bookings],
  );

  const allServices = useMemo(
    () =>
      bookings.flatMap((b) =>
        (b.serviceOrders || []).map((o: any) => ({
          ...o,
          bookingRef: b.confirmationNumber,
        })),
      ),
    [bookings],
  );

  const minibarTotals = useMemo(() => {
    let charged = 0;
    let waived = 0;
    let freeCount = 0;
    for (const u of allMiniBar) {
      if (u.isFree || u.amount === 0) freeCount += u.quantity || 1;
      if (u.status === 'WAIVED') waived += u.amount || 0;
      else if (u.status === 'PAID' || u.status === 'ON_BILL') charged += u.amount || 0;
    }
    return { charged, waived, freeCount };
  }, [allMiniBar]);

  const serviceTotals = useMemo(() => {
    const booked = allServices.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const paid = allServices
      .filter((o) => o.status === 'COMPLETED')
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    return { booked, paid };
  }, [allServices]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link
        href="/admin/guests"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Guests
      </Link>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{fullName}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  loyaltyColors[loyaltyTier] || loyaltyColors.STANDARD
                }`}
              >
                <Star className="h-3 w-3" />
                {loyaltyTier}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 mt-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{guest.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{profile.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <span>{profile.nationality || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>
                  {[profile.city, profile.country].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={() => setEditOpen(true)} variant="outline">
            Edit Profile
          </Button>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile icon={<Hotel className="h-5 w-5" />} label="Total Stays" value={totalStays} />
          <StatTile
            icon={<DollarSign className="h-5 w-5" />}
            label="Total Spent"
            value={money(totalSpent)}
          />
          <StatTile
            icon={<DollarSign className="h-5 w-5" />}
            label="Avg Spend / Stay"
            value={money(avgSpend)}
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stays">Stay History</TabsTrigger>
          <TabsTrigger value="minibar">Mini Bar</TabsTrigger>
          <TabsTrigger value="services">Services & Extras</TabsTrigger>
          <TabsTrigger value="arrivals">Arrivals & Departures</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {activeBooking ? (
            <Card className="border-blue-200 bg-blue-50/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Hotel className="h-5 w-5" /> Currently Checked In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <KV label="Room" value={activeBooking.room?.number || '—'} />
                  <KV label="Check-in" value={fmtDate(activeBooking.checkInDate)} />
                  <KV label="Check-out" value={fmtDate(activeBooking.checkOutDate)} />
                  <KV
                    label="Days Remaining"
                    value={Math.max(
                      0,
                      Math.ceil(
                        (new Date(activeBooking.checkOutDate).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                No active booking
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Recent Stays</h3>
            {recentBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500 text-sm">
                  No stays yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recentBookings.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-gray-500">
                          {b.confirmationNumber}
                        </span>
                        <StatusBadge value={b.status} map={bookingStatusColors} />
                      </div>
                      <div className="text-sm font-medium">Room {b.room?.number || '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-cyan-700">
                        {money(b.totalAmount)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Stay History */}
        <TabsContent value="stays" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {bookings.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">No stays</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Conf #</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Nights</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => {
                      const expanded = expandedBookingId === b.id;
                      return (
                        <Fragment key={b.id}>
                          <TableRow
                            onClick={() => setExpandedBookingId(expanded ? null : b.id)}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            <TableCell>
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {b.confirmationNumber}
                            </TableCell>
                            <TableCell>{b.room?.number || '—'}</TableCell>
                            <TableCell>{fmtDate(b.checkInDate)}</TableCell>
                            <TableCell>{fmtDate(b.checkOutDate)}</TableCell>
                            <TableCell>{nightsBetween(b.checkInDate, b.checkOutDate)}</TableCell>
                            <TableCell>
                              <StatusBadge value={b.status} map={bookingStatusColors} />
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {money(b.totalAmount)}
                            </TableCell>
                          </TableRow>
                          {expanded && (
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={8} className="p-4">
                                <BookingExpansion booking={b} />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mini Bar */}
        <TabsContent value="minibar" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beer className="h-5 w-5 text-amber-600" /> Mini Bar Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allMiniBar.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No mini bar charges
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMiniBar.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{fmtDate(u.recordedAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{u.bookingRef || '—'}</TableCell>
                        <TableCell>{u.roomNumber || '—'}</TableCell>
                        <TableCell>{u.item?.name || '—'}</TableCell>
                        <TableCell>{u.quantity}</TableCell>
                        <TableCell className="text-right">{money(u.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge value={u.status} map={minibarStatusColors} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatTile label="Total Charged" value={money(minibarTotals.charged)} />
            <StatTile label="Total Waived" value={money(minibarTotals.waived)} />
            <StatTile label="Free Items" value={minibarTotals.freeCount} />
          </div>
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-cyan-600" /> Services & Rentals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allServices.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No service orders
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rental</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allServices.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{fmtDate(o.scheduledDate || o.createdAt)}</TableCell>
                        <TableCell>{o.service?.name || '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {categoryEmoji[o.service?.category] || ''}
                            {o.service?.category || '—'}
                          </span>
                        </TableCell>
                        <TableCell>{o.room?.number || '—'}</TableCell>
                        <TableCell>
                          <StatusBadge value={o.status} map={serviceStatusColors} />
                        </TableCell>
                        <TableCell>
                          {o.isRental ? <RentalBadge order={o} /> : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-right">{money(o.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatTile label="Total Booked" value={money(serviceTotals.booked)} />
            <StatTile label="Total Paid" value={money(serviceTotals.paid)} />
          </div>
        </TabsContent>

        {/* Arrivals & Departures */}
        <TabsContent value="arrivals" className="mt-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                No bookings
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-mono text-xs text-gray-500">
                          {b.confirmationNumber}
                        </div>
                        <div className="text-sm font-medium">
                          {fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}
                        </div>
                      </div>
                      <StatusBadge value={b.status} map={bookingStatusColors} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-md p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <Plane className="h-4 w-4" /> Arrival
                        </div>
                        {b.arrival ? (
                          <div className="space-y-1 text-sm">
                            <KV label="Transport" value={b.arrival.transportType || '—'} />
                            <KV
                              label="Scheduled"
                              value={fmtDateTime(b.arrival.scheduledArrival)}
                            />
                            <KV
                              label="Checked in at"
                              value={fmtDateTime(b.arrival.checkedInAt)}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Status</span>
                              <StatusBadge
                                value={b.arrival.status}
                                map={arrivalStatusColors}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">No arrival record</div>
                        )}
                      </div>

                      <div className="border rounded-md p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <Plane className="h-4 w-4 rotate-90" /> Departure
                        </div>
                        {b.departure ? (
                          <div className="space-y-1 text-sm">
                            <KV
                              label="Scheduled"
                              value={fmtDateTime(b.departure.scheduledDeparture)}
                            />
                            <KV
                              label="Boarded at"
                              value={fmtDateTime(b.departure.boardedAt)}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Status</span>
                              <StatusBadge
                                value={b.departure.status}
                                map={departureStatusColors}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">No departure record</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={guest.id}
        profile={profile}
        onSaved={(updated) => {
          setGuest({ ...guest, guestProfile: { ...profile, ...updated } });
          router.refresh();
        }}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function RentalBadge({ order }: { order: any }) {
  const now = Date.now();
  const due = order.rentalDueAt ? new Date(order.rentalDueAt).getTime() : null;
  const returned = !!order.rentalReturnedAt;

  let label = 'Rental';
  let cls = 'bg-yellow-100 text-yellow-800';
  if (returned) {
    label = 'Returned';
    cls = 'bg-green-100 text-green-800';
  } else if (due && due < now) {
    label = 'Overdue';
    cls = 'bg-red-100 text-red-800';
  } else if (due) {
    label = 'Due';
    cls = 'bg-yellow-100 text-yellow-800';
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function BookingExpansion({ booking }: { booking: any }) {
  const payments: any[] = booking.payments || [];
  const minibar: any[] = booking.minIBarUsages || [];
  const services: any[] = booking.serviceOrders || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase">Payments</div>
        {payments.length === 0 ? (
          <div className="text-xs text-gray-400">No payments</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-gray-700">
                  {p.method} · {fmtDate(p.processedAt || p.createdAt)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{money(p.amount)}</span>
                  <StatusBadge value={p.status} map={paymentStatusColors} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase">Mini Bar</div>
        {minibar.length === 0 ? (
          <div className="text-xs text-gray-400">No charges</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {minibar.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2">
                <span className="text-gray-700">
                  {u.item?.name} × {u.quantity}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{money(u.amount)}</span>
                  <StatusBadge value={u.status} map={minibarStatusColors} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase">Services</div>
        {services.length === 0 ? (
          <div className="text-xs text-gray-400">No services</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {services.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <span className="text-gray-700">
                  {o.service?.name}
                  {o.isRental && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                      Rental
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{money(o.totalAmount)}</span>
                  <StatusBadge value={o.status} map={serviceStatusColors} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  userId,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  profile: any;
  onSaved: (updated: any) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [nationality, setNationality] = useState(profile.nationality || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : '',
  );
  const [address, setAddress] = useState(profile.address || '');
  const [city, setCity] = useState(profile.city || '');
  const [country, setCountry] = useState(profile.country || '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/guests/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          nationality,
          dateOfBirth: dateOfBirth || null,
          address,
          city,
          country,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      onSaved(json.profile || {});
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Guest Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
