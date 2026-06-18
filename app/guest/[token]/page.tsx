'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Receipt,
  ShoppingCart,
  HelpCircle,
  CheckCircle,
  MessageCircle,
  Loader2,
  Plus,
  Minus,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { StayChatPanel } from '@/components/stay-chat-panel';

const TEAL = '#14B8A6';

interface BookingInfo {
  id: string;
  confirmationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  platformFee: number;
  room: { id: string; number: string; name: string | null; type: string; basePrice: number } | null;
  property?: { name: string; currency?: string } | null;
  guest: {
    name: string | null;
    email: string;
    guestProfile: { firstName: string; lastName: string } | null;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    processedAt: string | null;
    createdAt: string;
  }>;
  serviceOrders: Array<{
    id: string;
    quantity: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    service: { name: string; category: string; price: number } | null;
  }>;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
}

function nights(from: string, to: string) {
  return Math.max(
    1,
    Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
  );
}

function fmtMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const REPORT_CATEGORIES = [
  'Maintenance',
  'Housekeeping',
  'Noise Complaint',
  'Lost Item',
  'Other',
];

export default function GuestPortalPage({
  params,
}: {
  params: { token: string };
}) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Services + cart
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Report
  const [reportCategory, setReportCategory] = useState('Maintenance');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [checkInData, setCheckInData] = useState<{
    checkInCode?: string;
    checkoutCode?: string;
    checkInQrUrl?: string;
    checkoutQrUrl?: string;
    status?: string;
    keysIssued?: boolean;
    checkoutReadyAt?: string | null;
    houseRules?: string;
    keyHandoffMessage?: string;
    allowInAppCheckoutPay?: boolean;
    room?: { number: string; name: string | null };
  } | null>(null);
  const [paying, setPaying] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guest/${params.token}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || 'Booking not found');
        } else {
          setBooking(data.booking);
          fetch(`/api/guest/${params.token}/checkin`)
            .then((r) => r.json())
            .then((d) => { if (d.checkInCode) setCheckInData(d); })
            .catch(() => {});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function loadServices() {
    if (services.length > 0 || servicesLoading) return;
    setServicesLoading(true);
    try {
      const res = await fetch(`/api/guest/${params.token}/services`);
      const data = await res.json();
      if (res.ok) setServices(data.services || []);
    } finally {
      setServicesLoading(false);
    }
  }

  const currency = booking?.property?.currency || 'USD';
  const stayNights = booking
    ? nights(booking.checkInDate, booking.checkOutDate)
    : 0;
  const roomCharge = booking
    ? (booking.room?.basePrice ?? 0) * stayNights
    : 0;
  const servicesTotal = booking
    ? (booking.serviceOrders || []).reduce(
        (s, o) => s + (o.totalAmount || 0),
        0
      )
    : 0;
  const paidTotal = booking
    ? (booking.payments || [])
        .filter((p) => p.status === 'COMPLETED')
        .reduce((s, p) => s + p.amount, 0)
    : 0;
  const grandTotal = roomCharge + servicesTotal + (booking?.platformFee || 0);
  const balance = grandTotal - paidTotal;

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const svc = services.find((s) => s.id === id);
          if (!svc) return null;
          return { svc, qty };
        })
        .filter(Boolean) as Array<{ svc: ServiceItem; qty: number }>,
    [cart, services]
  );
  const cartTotal = cartItems.reduce(
    (s, i) => s + i.svc.price * i.qty,
    0
  );
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function removeFromCart(id: string) {
    setCart((c) => {
      const next = { ...c };
      const cur = (next[id] || 0) - 1;
      if (cur <= 0) delete next[id];
      else next[id] = cur;
      return next;
    });
  }

  async function placeOrder() {
    if (cartItems.length === 0 || ordering) return;
    setOrdering(true);
    setOrderSuccess(false);
    try {
      const res = await fetch(`/api/guest/${params.token}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((i) => ({
            serviceId: i.svc.id,
            quantity: i.qty,
          })),
          notes: orderNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || 'Order failed');
      } else {
        setCart({});
        setOrderNotes('');
        setOrderSuccess(true);
        setToast('Order placed! Staff have been notified.');
        // Refresh booking to update bill
        const refresh = await fetch(`/api/guest/${params.token}`);
        if (refresh.ok) {
          const fresh = await refresh.json();
          setBooking(fresh.booking);
        }
      }
    } catch (e: any) {
      setToast(e?.message || 'Order failed');
    } finally {
      setOrdering(false);
    }
  }

  async function submitReport() {
    if (!reportDescription.trim() || reporting) return;
    setReporting(true);
    setReportError(null);
    setReportSuccess(false);
    try {
      const res = await fetch(`/api/guest/${params.token}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: reportCategory,
          description: reportDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportError(data.error || 'Submission failed');
      } else {
        setReportSuccess(true);
        setReportDescription('');
        setToast('Report sent to staff.');
      }
    } catch (e: any) {
      setReportError(e?.message || 'Submission failed');
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm">Loading your stay…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold">Link expired or invalid</h1>
            <p className="text-sm text-gray-500">
              {error || 'Please ask the front desk for a new link.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const guestName =
    booking.guest?.guestProfile?.firstName ||
    booking.guest?.name?.split(' ')[0] ||
    'Guest';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top brand bar */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight" style={{ color: TEAL }}>
              amaldives
            </span>
            <span className="text-lg font-light text-gray-700 tracking-widest">
              STAY
            </span>
          </div>
          {booking.room && (
            <Badge
              variant="outline"
              className="text-sm border-teal-500 text-teal-700 bg-teal-50"
            >
              Room {booking.room.number}
            </Badge>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5">
        {/* Greeting */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {guestName}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {booking.room?.name || booking.room?.type}
            {booking.property?.name ? ` · ${booking.property.name}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(booking.checkInDate).toLocaleDateString()} →{' '}
            {new Date(booking.checkOutDate).toLocaleDateString()} · {stayNights}{' '}
            night{stayNights !== 1 ? 's' : ''}
          </p>
        </div>

        <Tabs defaultValue="bill" className="w-full">
          <TabsList className="grid grid-cols-5 w-full h-12 bg-white border">
            <TabsTrigger
              value="bill"
              className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">My Bill</span>
            </TabsTrigger>
            <TabsTrigger
              value="checkin"
              className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
            >
              <QrCode className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Check-in</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Chat</span>
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
              onClick={loadServices}
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Room Service</span>
            </TabsTrigger>
            <TabsTrigger
              value="help"
              className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
            >
              <HelpCircle className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Get Help</span>
            </TabsTrigger>
          </TabsList>

          {/* BILL TAB */}
          <TabsContent value="bill" className="mt-4 space-y-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="font-semibold text-gray-800">Charges</h2>

                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-gray-700">Room ({stayNights} nights)</p>
                    <p className="text-xs text-gray-400">
                      {fmtMoney(booking.room?.basePrice || 0, currency)} ×{' '}
                      {stayNights}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {fmtMoney(roomCharge, currency)}
                  </p>
                </div>

                {booking.serviceOrders.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Services
                    </p>
                    {booking.serviceOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex justify-between items-start text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-gray-700 truncate">
                            {o.service?.name || 'Service'}
                            {o.quantity > 1 && (
                              <span className="text-gray-400"> × {o.quantity}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase">
                            {o.status.replace('_', ' ')}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900 shrink-0">
                          {fmtMoney(o.totalAmount, currency)}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {booking.platformFee > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <p className="text-gray-700">Platform fee</p>
                      <p className="font-medium text-gray-900">
                        {fmtMoney(booking.platformFee, currency)}
                      </p>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between items-center">
                  <p className="text-base font-semibold text-gray-900">Total</p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: TEAL }}
                  >
                    {fmtMoney(grandTotal, currency)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="font-semibold text-gray-800">Payments</h2>
                {booking.payments.length === 0 ? (
                  <p className="text-sm text-gray-400">No payments yet.</p>
                ) : (
                  booking.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <div>
                        <p className="text-gray-700">{p.method.replace('_', ' ')}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(
                            p.processedAt || p.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            p.status === 'COMPLETED'
                              ? 'border-green-500 bg-green-50 text-green-700 text-[10px]'
                              : 'border-gray-300 text-gray-500 text-[10px]'
                          }
                        >
                          {p.status}
                        </Badge>
                        <p className="font-medium text-gray-900">
                          {fmtMoney(p.amount, currency)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">
                    Balance due
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      balance > 0.01 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {fmtMoney(Math.max(0, balance), currency)}
                  </p>
                </div>
                {checkInData?.checkoutReadyAt && checkInData.checkoutCode && (
                  <div className="pt-3 space-y-3 border-t">
                    <p className="text-sm font-semibold text-gray-800">Express checkout</p>
                    <p className="text-xs text-gray-500">
                      Show this at the desk or pay below before you leave.
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        checkInData.checkoutQrUrl || checkInData.checkoutCode,
                      )}`}
                      alt="Checkout QR"
                      className="mx-auto rounded-lg border p-2 bg-white"
                      width={160}
                      height={160}
                    />
                    <p className="font-mono text-xs text-center text-gray-700">
                      {checkInData.checkoutCode}
                    </p>
                  </div>
                )}
                {balance > 0.01 && checkInData?.allowInAppCheckoutPay && (
                  <Button
                    className="w-full mt-3 bg-teal-600 hover:bg-teal-700"
                    disabled={paying}
                    onClick={async () => {
                      setPaying(true);
                      try {
                        const res = await fetch(`/api/guest/${params.token}/pay`, { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Payment failed');
                        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Could not start payment');
                      } finally {
                        setPaying(false);
                      }
                    }}
                  >
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay balance with card'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4 text-center">
                {checkInData?.status === 'CHECKED_IN' ? (
                  <>
                    <p className="font-semibold text-green-700">You&apos;re checked in</p>
                    {checkInData.room && (
                      <p className="text-lg font-bold">Room {checkInData.room.number}</p>
                    )}
                    {checkInData.keysIssued ? (
                      <p className="text-sm text-gray-600">Keys issued — enjoy your stay!</p>
                    ) : (
                      <p className="text-sm text-amber-700">{checkInData.keyHandoffMessage}</p>
                    )}
                    {checkInData.houseRules && (
                      <div className="text-left text-sm text-gray-700 border rounded-lg p-3 bg-gray-50 whitespace-pre-wrap">
                        {checkInData.houseRules}
                      </div>
                    )}
                  </>
                ) : checkInData?.checkInCode ? (
                  <>
                    <p className="text-sm text-gray-600">Show this QR at the front desk for instant check-in</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        checkInData.checkInQrUrl || checkInData.checkInCode,
                      )}`}
                      alt="Check-in QR"
                      className="mx-auto rounded-lg border p-2 bg-white"
                      width={200}
                      height={200}
                    />
                    <p className="font-mono text-sm text-gray-800">{checkInData.checkInCode}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Loading check-in…</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Message the front desk</h2>
                <StayChatPanel
                  apiPath={`/api/guest/${params.token}/chat`}
                  senderRole="GUEST"
                  emptyHint="Ask about transfers, late checkout, or anything you need during your stay."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SERVICES TAB */}
          <TabsContent value="services" className="mt-4 space-y-3">
            {servicesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            ) : services.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-gray-500">
                  No services available right now.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((svc) => {
                    const qty = cart[svc.id] || 0;
                    return (
                      <Card key={svc.id} className="overflow-hidden">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {svc.name}
                              </p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                {svc.category}
                              </p>
                            </div>
                            <p
                              className="font-bold text-sm shrink-0"
                              style={{ color: TEAL }}
                            >
                              {fmtMoney(svc.price, currency)}
                            </p>
                          </div>
                          {svc.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {svc.description}
                            </p>
                          )}
                          <div className="flex items-center justify-end gap-1.5">
                            {qty > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 w-9 p-0"
                                  onClick={() => removeFromCart(svc.id)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="font-medium text-sm w-6 text-center">
                                  {qty}
                                </span>
                              </>
                            )}
                            <Button
                              size="sm"
                              className="h-9 w-9 p-0 bg-teal-500 hover:bg-teal-600"
                              onClick={() => addToCart(svc.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Cart summary */}
                {cartCount > 0 && (
                  <Card className="border-teal-500 border-2">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-gray-800">
                        Your order ({cartCount} item{cartCount !== 1 ? 's' : ''})
                      </h3>
                      {cartItems.map(({ svc, qty }) => (
                        <div
                          key={svc.id}
                          className="flex justify-between text-sm"
                        >
                          <p className="text-gray-700 truncate">
                            {svc.name}
                            <span className="text-gray-400"> × {qty}</span>
                          </p>
                          <p className="font-medium text-gray-900">
                            {fmtMoney(svc.price * qty, currency)}
                          </p>
                        </div>
                      ))}
                      <Textarea
                        placeholder="Special instructions (optional)"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="min-h-20 text-sm"
                      />
                      <Separator />
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Total</p>
                        <p
                          className="text-lg font-bold"
                          style={{ color: TEAL }}
                        >
                          {fmtMoney(cartTotal, currency)}
                        </p>
                      </div>
                      <Button
                        className="w-full min-h-12 bg-teal-500 hover:bg-teal-600 text-base"
                        disabled={ordering || booking.status !== 'CHECKED_IN'}
                        onClick={placeOrder}
                      >
                        {ordering ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          'Order Now'
                        )}
                      </Button>
                      {booking.status !== 'CHECKED_IN' && (
                        <p className="text-xs text-amber-600 text-center">
                          Orders are available once you've checked in.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {orderSuccess && cartCount === 0 && (
                  <Card className="border-green-500 border-2 bg-green-50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                      <p className="text-sm text-green-800">
                        Your order was placed. Staff have been notified.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* HELP TAB */}
          <TabsContent value="help" className="mt-4 space-y-3">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-800">Need help?</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Tell us what's wrong and a team member will follow up.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Category
                  </label>
                  <Select
                    value={reportCategory}
                    onValueChange={setReportCategory}
                  >
                    <SelectTrigger className="min-h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    What's happening?
                  </label>
                  <Textarea
                    placeholder="Describe the issue in a few sentences…"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="min-h-28 text-sm"
                  />
                </div>

                <Button
                  className="w-full min-h-12 bg-teal-500 hover:bg-teal-600 text-base"
                  disabled={reporting || !reportDescription.trim()}
                  onClick={submitReport}
                >
                  {reporting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Send to staff'
                  )}
                </Button>

                {reportSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    Thanks! Your report has been sent to the team.
                  </div>
                )}
                {reportError && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {reportError}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xs w-[90%]">
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg px-4 py-3 text-center">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
