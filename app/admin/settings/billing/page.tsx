'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard } from 'lucide-react';

const PLANS = [
  { key: 'growth', name: 'Growth', price: '$19/mo', desc: 'Channel sync + SMS' },
  { key: 'business', name: 'Business', price: '$49/mo', desc: 'API + multi-property' },
  { key: 'channel', name: 'Channel Plus', price: '$79/mo', desc: 'Priority sync + Stripe direct' },
  { key: 'web', name: 'Web Presence', price: '$29/mo', desc: 'Own-domain website + brand email + hosting' },
];

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState<string | null>(null);

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
