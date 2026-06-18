'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, CreditCard, Copy, Check, RefreshCw } from 'lucide-react';
import { getPaymentsConfig, getDepositConfig, type PaymentProvider, type TenantPaymentsConfig } from '@/lib/tenant-settings';

interface PaymentsSettingsProps {
  tenant: {
    subdomain: string;
    settings?: unknown;
  };
  stripePlatformConfigured: boolean;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
      className="p-1 rounded hover:bg-gray-100 text-gray-400"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function generateSecret(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function PaymentsSettings({ tenant, stripePlatformConfigured }: PaymentsSettingsProps) {
  const router = useRouter();
  const initial = getPaymentsConfig(tenant.settings);
  const depositInitial = getDepositConfig(tenant.settings);
  const baseSettings = (tenant.settings as Record<string, unknown>) ?? {};

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currency, setCurrency] = useState<'USD' | 'MVR'>(initial.currency ?? 'USD');
  const [defaultProvider, setDefaultProvider] = useState<PaymentProvider>(
    initial.defaultProvider ?? 'stripe'
  );
  const [stripeEnabled, setStripeEnabled] = useState(
    initial.enabledProviders?.includes('stripe') ?? true
  );
  const [mayaEnabled, setMayaEnabled] = useState(initial.enabledProviders?.includes('maya') ?? false);
  const [bmlEnabled, setBmlEnabled] = useState(
    initial.enabledProviders?.includes('bml_connect') ?? false
  );
  const [payAtProperty, setPayAtProperty] = useState(
    initial.enabledProviders?.includes('pay_at_property') ?? true
  );

  const [bmlMerchantId, setBmlMerchantId] = useState(initial.bmlConnect?.merchantId ?? '');
  const [mayaMerchantId, setMayaMerchantId] = useState(initial.maya?.merchantId ?? '');
  const [mayaApiKey, setMayaApiKey] = useState(initial.maya?.apiKey ?? '');
  const [mayaWebhookSecret, setMayaWebhookSecret] = useState(initial.maya?.webhookSecret ?? '');
  const [mayaPortalSlug, setMayaPortalSlug] = useState(initial.maya?.portalSlug ?? '');

  const [depositEnabled, setDepositEnabled] = useState(depositInitial.enabled ?? false);
  const [depositPercent, setDepositPercent] = useState(String(depositInitial.percent ?? 30));
  const [depositMinAmount, setDepositMinAmount] = useState(
    depositInitial.minAmount != null ? String(depositInitial.minAmount) : '',
  );

  const bmlWebhook = `https://stay.amaldives.com/api/webhooks/bml-connect/${tenant.subdomain}`;
  const mayaWebhook = `https://${tenant.subdomain}.stay.amaldives.com/api/webhooks/maya/${tenant.subdomain}`;

  async function save() {
    setSaving(true);
    const enabledProviders: PaymentProvider[] = [];
    if (stripeEnabled) enabledProviders.push('stripe');
    if (mayaEnabled) enabledProviders.push('maya');
    if (bmlEnabled) enabledProviders.push('bml_connect');
    if (payAtProperty) enabledProviders.push('pay_at_property');

    const payments: TenantPaymentsConfig = {
      currency,
      defaultProvider,
      enabledProviders: enabledProviders.length ? enabledProviders : ['pay_at_property'],
      bmlConnect: bmlEnabled
        ? { merchantId: bmlMerchantId.trim() || undefined }
        : undefined,
      maya: mayaEnabled
        ? {
            merchantId: mayaMerchantId.trim() || undefined,
            apiKey: mayaApiKey.trim() || undefined,
            webhookSecret: mayaWebhookSecret.trim() || undefined,
            portalSlug: mayaPortalSlug.trim() || tenant.subdomain,
          }
        : undefined,
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...baseSettings,
            payments,
            deposit: {
              enabled: depositEnabled,
              percent: Number(depositPercent) || 0,
              minAmount: depositMinAmount.trim() ? Number(depositMinAmount) : undefined,
            },
          },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      alert('Could not save payment settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-cyan-600" />
          Online payments
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose how guests pay when they book on your website or amaldives.com — no technical setup beyond copying a webhook URL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency for online checkout</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'MVR')}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="MVR">MVR — Maldivian Rufiyaa</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Default payment option shown first</Label>
              <select
                value={defaultProvider}
                onChange={(e) => setDefaultProvider(e.target.value as PaymentProvider)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="stripe">Card (Stripe)</option>
                <option value="maya">Maya</option>
                <option value="bml_connect">BML Connect</option>
                <option value="pay_at_property">Pay at property</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe (international cards)</CardTitle>
          <p className="text-sm text-gray-500">
            {stripePlatformConfigured
              ? 'Platform Stripe is active — guests can pay by Visa/Mastercard on direct bookings.'
              : 'Ask amaldives support to add STRIPE keys on the server (one-time platform setup).'}
          </p>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stripeEnabled}
              disabled={!stripePlatformConfigured}
              onChange={(e) => setStripeEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Accept card payments via Stripe</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maya Business (Maldives)</CardTitle>
          <p className="text-sm text-gray-500">
            Per-property Maya credentials — webhook is unique to your subdomain.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={mayaEnabled}
              onChange={(e) => setMayaEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Enable Maya for guest checkout</span>
          </label>

          {mayaEnabled && (
            <>
              <div className="space-y-2">
                <Label>Maya merchant ID</Label>
                <Input
                  value={mayaMerchantId}
                  onChange={(e) => setMayaMerchantId(e.target.value)}
                  placeholder="From Maya Business dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label>Maya API key (optional)</Label>
                <Input
                  type="password"
                  value={mayaApiKey}
                  onChange={(e) => setMayaApiKey(e.target.value)}
                  placeholder="If required by your Maya account"
                />
              </div>
              <div className="space-y-2">
                <Label>Portal slug</Label>
                <Input
                  value={mayaPortalSlug}
                  onChange={(e) => setMayaPortalSlug(e.target.value)}
                  placeholder={tenant.subdomain}
                />
                <p className="text-xs text-gray-500">
                  Used to label your property in Maya — defaults to {tenant.subdomain}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Webhook URL — paste in Maya Business</Label>
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <code className="text-xs flex-1 break-all text-cyan-800">{mayaWebhook}</code>
                  <CopyBtn text={mayaWebhook} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webhook secret</Label>
                <div className="flex gap-2">
                  <Input
                    value={mayaWebhookSecret}
                    onChange={(e) => setMayaWebhookSecret(e.target.value)}
                    placeholder="Set in Maya and paste the same value here"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMayaWebhookSecret(generateSecret())}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Maya sends this as <code className="bg-gray-100 px-1 rounded">x-maya-signature</code> — must match on both sides.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">BML Connect (Bank of Maldives)</CardTitle>
          <p className="text-sm text-gray-500">
            For online card payments through BML — set <strong>localId</strong> to the booking confirmation number.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bmlEnabled}
              onChange={(e) => setBmlEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Enable BML Connect payments</span>
          </label>

          {bmlEnabled && (
            <>
              <div className="space-y-2">
                <Label>BML merchant ID (optional reference)</Label>
                <Input
                  value={bmlMerchantId}
                  onChange={(e) => setBmlMerchantId(e.target.value)}
                  placeholder="Your BML Connect merchant reference"
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL — paste in BML Connect portal</Label>
                <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                  <code className="text-xs flex-1 break-all text-sky-800">{bmlWebhook}</code>
                  <CopyBtn text={bmlWebhook} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking deposit</CardTitle>
          <p className="text-sm text-gray-500">
            Charge a percentage online at booking; balance due at check-in or checkout.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Require deposit for online card bookings</span>
          </label>
          {depositEnabled && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit % of stay total</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum deposit (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={depositMinAmount}
                  onChange={(e) => setDepositMinAmount(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pay at property</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={payAtProperty}
              onChange={(e) => setPayAtProperty(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">
              Let guests confirm booking without paying online (pay on arrival)
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" /> Saved
          </span>
        )}
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save payment settings'}
        </Button>
      </div>
    </div>
  );
}
