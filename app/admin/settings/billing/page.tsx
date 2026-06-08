'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react';

const PLANS = [
  { key: 'growth', name: 'Growth', price: '$19/mo', desc: 'Channel sync + SMS' },
  { key: 'business', name: 'Business', price: '$49/mo', desc: 'API + multi-property' },
  { key: 'channel', name: 'Channel Plus', price: '$79/mo', desc: 'Priority sync + Stripe direct' },
  { key: 'web', name: 'Web Presence', price: '$29/mo', desc: 'Own-domain website + brand email + hosting' },
];

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'info'; text: string } | null>(null);

  // On the Stripe success redirect, confirm + activate the plan (no webhook needed).
  useEffect(() => {
    const url = new URL(window.location.href);
    const success = url.searchParams.get('success');
    const cancelled = url.searchParams.get('cancelled');
    const sessionId = url.searchParams.get('session_id');
    if (success === '1' && sessionId) {
      setBanner({ kind: 'info', text: 'Confirming your subscription…' });
      fetch('/api/admin/billing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setBanner({ kind: 'ok', text: `Subscription active — your ${d.plan} plan is now unlocked.` });
          else setBanner({ kind: 'info', text: 'Payment received — your plan will activate shortly.' });
        })
        .catch(() => setBanner({ kind: 'info', text: 'Payment received.' }));
      window.history.replaceState({}, '', '/admin/settings/billing');
    } else if (cancelled === '1') {
      setBanner({ kind: 'info', text: 'Checkout cancelled — no changes made.' });
      window.history.replaceState({}, '', '/admin/settings/billing');
    }
  }, []);

  async function subscribe(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch('/api/admin/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else alert(data.error || 'Could not start checkout');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-cyan-600" />
          Subscription & billing
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Upgrade securely with Stripe. Cancel anytime from your Stripe customer portal.
        </p>
      </div>

      {banner && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            banner.kind === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-cyan-200 bg-cyan-50 text-cyan-800'
          }`}
        >
          {banner.kind === 'ok' && <CheckCircle2 className="h-4 w-4" />}
          {banner.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.key}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription>{p.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-4">{p.price}</p>
              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={!!loading}
                onClick={() => subscribe(p.key)}
              >
                {loading === p.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Upgrade'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
