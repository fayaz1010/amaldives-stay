'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Loader2, CheckCircle, Copy, Check, RefreshCw, Terminal, CreditCard } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  description?: string | null;
  plan: string;
  commissionRate: number;
  status: string;
  settings?: any;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

interface SettingsFormProps {
  tenant: Tenant;
  property: Property | null;
}

function generateSecret(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} type="button"
      className="ml-1.5 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function SettingsForm({ tenant, property }: SettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [name, setName] = useState(tenant.name);
  const [description, setDescription] = useState(tenant.description ?? '');
  const [address, setAddress] = useState(property?.address ?? '');
  const [city, setCity] = useState(property?.city ?? '');
  const [state, setState] = useState(property?.state ?? '');
  const [phone, setPhone] = useState(property?.phone ?? '');
  const [email, setEmail] = useState(property?.email ?? '');

  // FPOS settings
  const fposSettings = tenant.settings?.fpos ?? {};
  const [fposEnabled, setFposEnabled] = useState(fposSettings.enabled ?? false);
  const [fposSecret, setFposSecret] = useState(fposSettings.webhookSecret ?? '');
  const [savingFpos, setSavingFpos] = useState(false);
  const [fposSaved, setFposSaved] = useState(false);

  // Default transport plan settings
  const defaultPlans = tenant.settings?.defaultPlans ?? {};
  const [defaultArrivalTransport, setDefaultArrivalTransport] = useState<string>(defaultPlans.arrivalTransportType ?? '');
  const [defaultDepartureTransport, setDefaultDepartureTransport] = useState<string>(defaultPlans.departureTransportType ?? '');
  const [defaultArrivalJetty, setDefaultArrivalJetty] = useState<string>(defaultPlans.arrivalJettyTransport ?? '');
  const [defaultDepartureJetty, setDefaultDepartureJetty] = useState<string>(defaultPlans.departureJettyTransport ?? '');
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const webhookUrl = `https://${tenant.subdomain}.stay.amaldives.com/api/webhooks/fpos`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedAt(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, address, city, state, phone, email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function saveFpos() {
    setSavingFpos(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...tenant.settings,
            fpos: { enabled: fposEnabled, webhookSecret: fposSecret },
          },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setFposSaved(true);
      setTimeout(() => setFposSaved(false), 2000);
      router.refresh();
    } catch {
      alert('Failed to save FPOS settings');
    } finally {
      setSavingFpos(false);
    }
  }

  async function saveDefaults() {
    setSavingDefaults(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...tenant.settings,
            defaultPlans: {
              arrivalTransportType: defaultArrivalTransport || null,
              departureTransportType: defaultDepartureTransport || null,
              arrivalJettyTransport: defaultArrivalJetty || null,
              departureJettyTransport: defaultDepartureJetty || null,
            },
          },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setDefaultsSaved(true);
      setTimeout(() => setDefaultsSaved(false), 2000);
      router.refresh();
    } catch {
      alert('Failed to save default plan settings');
    } finally {
      setSavingDefaults(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description}
                onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Tell guests about your property…" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm pt-2">
              <div>
                <Label className="text-gray-500">Subdomain</Label>
                <p className="font-medium text-cyan-700">{tenant.subdomain}.stay.amaldives.com</p>
              </div>
              <div>
                <Label className="text-gray-500">Plan</Label>
                <p className="font-medium capitalize">{tenant.plan}</p>
              </div>
              <div>
                <Label className="text-gray-500">Commission Rate</Label>
                <p className="font-medium">{(tenant.commissionRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <Label className="text-gray-500">Status</Label>
                <p className={`font-medium ${tenant.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                  {tenant.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {property && (
          <Card>
            <CardHeader><CardTitle>Contact &amp; Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Island / City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Atoll / State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          {savedAt && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* ── Online payments (Stripe / Maya / BML) ───────── */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cyan-600" />
              <CardTitle>Guest booking payments</CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Stripe, Maya, BML Connect, and pay-at-property — configured on a simple form, no JSON editing.
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/admin/settings/payments">
              <Button type="button" variant="outline" className="border-cyan-200 text-cyan-800 hover:bg-cyan-50">
                Open payment settings →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── FPOS Integration ─────────────────────────────── */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gray-600" />
              <CardTitle>FPOS / POS Terminal Integration</CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Connect your physical point-of-sale terminal so payments are automatically posted
              to the guest folio in real time.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={fposEnabled}
                onChange={(e) => setFposEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300" />
              <span className="text-sm font-medium">Enable FPOS webhook</span>
              {fposEnabled && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </label>

            {fposEnabled && (
              <>
                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label className="text-sm">Webhook URL <span className="text-gray-400">(configure in your POS)</span></Label>
                  <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                    <code className="text-xs text-cyan-700 flex-1 break-all">{webhookUrl}</code>
                    <CopyButton text={webhookUrl} />
                  </div>
                </div>

                {/* Webhook secret */}
                <div className="space-y-2">
                  <Label className="text-sm">Webhook Secret <span className="text-gray-400">(send as Bearer token in Authorization header)</span></Label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-gray-50 border rounded-lg px-3 py-2">
                      <code className="text-xs text-gray-700 flex-1 break-all font-mono">
                        {fposSecret || <span className="text-gray-400 italic">No secret set — webhook is open (not recommended)</span>}
                      </code>
                      {fposSecret && <CopyButton text={fposSecret} />}
                    </div>
                    <Button type="button" size="sm" variant="outline"
                      onClick={() => setFposSecret(generateSecret())}
                      className="shrink-0 gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> Generate
                    </Button>
                  </div>
                  {fposSecret && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      ⚠ Copy this secret now — it won't be shown again after saving.
                    </p>
                  )}
                </div>

                {/* Payload format */}
                <div className="space-y-2">
                  <Label className="text-sm">Expected Payload Format (POST to webhook URL)</Label>
                  <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto">{`{
  "subdomain": "${tenant.subdomain}",
  "bookingRef": "STAY-XXXXXXXX",
  "amount": 150.00,
  "currency": "USD",
  "method": "CARD",
  "transactionId": "POS-TXN-001",
  "notes": "Room 201 charges"
}

// Authorization: Bearer YOUR_WEBHOOK_SECRET`}</pre>
                </div>

                {/* Supported methods */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Supported Payment Methods</Label>
                  <div className="flex flex-wrap gap-2">
                    {['CASH', 'CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CRYPTO'].map((m) => (
                      <span key={m} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                        {m}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Method aliases like "card", "credit", "debit" are also accepted and normalised automatically.
                  </p>
                </div>

                {/* Maldives-specific integrations */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-semibold">🇲🇻 Maldives Bank Integration</Label>

                  {/* BML Physical FPOS */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏦</span>
                      <span className="font-semibold text-sm text-blue-800">Bank of Maldives (BML) Physical FPOS</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      BML's physical card terminals do <strong>not</strong> support automatic webhooks.
                      The fastest workflow: after a guest pays on the BML terminal, tap the <strong>💳 Quick Pay button</strong> on their reservation card, select "BML Card", enter the slip number, and confirm in 5 seconds.
                    </p>
                    <div className="bg-white rounded p-2 text-[11px] text-gray-600 space-y-0.5">
                      <p className="font-semibold text-gray-700">Steps for staff:</p>
                      <p>1. Guest pays on BML FPOS machine → get slip</p>
                      <p>2. Click 💳 on the reservation card in the system</p>
                      <p>3. Select "BML Card", enter slip number</p>
                      <p>4. Hit Confirm — done in under 10 seconds</p>
                    </div>
                  </div>

                  {/* MIB Physical FPOS */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🕌</span>
                      <span className="font-semibold text-sm text-emerald-800">Maldives Islamic Bank (MIB) FPOS</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Same as BML — use <strong>Quick Pay → MIB Card</strong> after the terminal transaction and enter the MIB slip reference number.
                    </p>
                  </div>

                  {/* BML Connect IPG */}
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌐</span>
                      <span className="font-semibold text-sm text-sky-800">BML Connect (Internet Payment Gateway)</span>
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium border border-sky-300">Auto-post</span>
                    </div>
                    <p className="text-xs text-sky-700">
                      BML Connect <strong>does</strong> support webhooks. Payments made via BML Connect online gateway auto-post to the guest folio. Set this webhook URL in your <a href="https://connect.bankofmaldives.mv" target="_blank" rel="noreferrer" className="underline font-medium">BML Connect merchant portal</a>:
                    </p>
                    <div className="flex items-center gap-2 bg-white border rounded px-2 py-1.5">
                      <code className="text-xs text-sky-700 flex-1 break-all">
                        {`https://stay.amaldives.com/api/webhooks/bml-connect/${tenant.subdomain}`}
                      </code>
                      <CopyButton text={`https://stay.amaldives.com/api/webhooks/bml-connect/${tenant.subdomain}`} />
                    </div>
                    <div className="text-[11px] text-sky-600 space-y-0.5">
                      <p>In BML Connect portal: <strong>Settings → Webhook URL</strong> → paste the URL above</p>
                      <p>Set <strong>localId</strong> = booking confirmation number when initiating payment</p>
                      <p>Supports USD and MVR transactions</p>
                    </div>
                  </div>

                  {/* mFaisaa */}
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span className="font-semibold text-sm text-cyan-800">mFaisaa (BML Mobile Pay)</span>
                    </div>
                    <p className="text-xs text-cyan-700">
                      After receiving an mFaisaa payment notification, use <strong>Quick Pay → mFaisaa</strong> and enter the mFaisaa transaction reference number from the BML merchant app.
                    </p>
                    <p className="text-[11px] text-cyan-600">
                      For automatic posting, enable BML Connect and request mFaisaa webhook support from BML merchant services.
                    </p>
                  </div>
                </div>

                {/* Other integrations */}
                <div className="space-y-2">
                  <Label className="text-sm">Other Compatible Systems (generic webhook)</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    {[
                      ['Stripe Terminal', 'Stripe Webhook → payment_intent.succeeded'],
                      ['Square POS', 'Square Webhooks → payment.completed'],
                      ['SumUp', 'SumUp Transaction Webhook'],
                      ['Toast POS', 'Toast API Webhooks'],
                      ['Lightspeed', 'Lightspeed Payment notifications'],
                      ['Custom / Any', 'Any POS that supports HTTP POST webhooks'],
                    ].map(([name, note]) => (
                      <div key={name} className="border rounded p-2 bg-gray-50">
                        <p className="font-medium">{name}</p>
                        <p className="text-gray-400 text-[11px]">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              {fposSaved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Saved
                </span>
              )}
              <Button type="button" onClick={saveFpos} disabled={savingFpos}
                className="bg-teal-600 hover:bg-teal-700">
                {savingFpos ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save FPOS Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Default Transport Plans ────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Default Transport Plans</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Pre-set transport types for arrival and departure plans. When a plan is created these defaults will be pre-selected, saving time for your team.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-6">
              {/* Arrival defaults */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-cyan-700 flex items-center gap-1.5">
                  ✈️ Default Arrival Transport
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="defaultArrivalTransport">Inbound Transport Type</Label>
                  <select
                    id="defaultArrivalTransport"
                    value={defaultArrivalTransport}
                    onChange={(e) => setDefaultArrivalTransport(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— No default —</option>
                    <option value="DOMESTIC_FLIGHT">✈️ Domestic Flight</option>
                    <option value="SEAPLANE">🛩️ Seaplane</option>
                    <option value="FERRY">🚢 Ferry</option>
                    <option value="SPEEDBOAT">🚤 Speedboat</option>
                    <option value="CHARTER_BOAT">⛵ Charter Boat</option>
                    <option value="SELF_ARRANGED">👤 Self Arranged</option>
                    <option value="OTHER">📦 Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultArrivalJetty">Default Jetty Transfer</Label>
                  <select
                    id="defaultArrivalJetty"
                    value={defaultArrivalJetty}
                    onChange={(e) => setDefaultArrivalJetty(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— No default —</option>
                    <option value="SPEEDBOAT">🚤 Speedboat</option>
                    <option value="DHONI">🛶 Dhoni</option>
                    <option value="FERRY">🚢 Ferry</option>
                    <option value="NONE">🚶 Walk / No transfer</option>
                  </select>
                </div>
              </div>

              {/* Departure defaults */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-teal-700 flex items-center gap-1.5">
                  🛫 Default Departure Transport
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="defaultDepartureTransport">Outbound Transport Type</Label>
                  <select
                    id="defaultDepartureTransport"
                    value={defaultDepartureTransport}
                    onChange={(e) => setDefaultDepartureTransport(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— No default —</option>
                    <option value="DOMESTIC_FLIGHT">✈️ Domestic Flight</option>
                    <option value="SEAPLANE">🛩️ Seaplane</option>
                    <option value="FERRY">🚢 Ferry</option>
                    <option value="SPEEDBOAT">🚤 Speedboat</option>
                    <option value="CHARTER_BOAT">⛵ Charter Boat</option>
                    <option value="SELF_ARRANGED">👤 Self Arranged</option>
                    <option value="OTHER">📦 Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultDepartureJetty">Default Jetty Transfer</Label>
                  <select
                    id="defaultDepartureJetty"
                    value={defaultDepartureJetty}
                    onChange={(e) => setDefaultDepartureJetty(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— No default —</option>
                    <option value="SPEEDBOAT">🚤 Speedboat</option>
                    <option value="DHONI">🛶 Dhoni</option>
                    <option value="FERRY">🚢 Ferry</option>
                    <option value="NONE">🚶 Walk / No transfer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              {defaultsSaved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Saved
                </span>
              )}
              <Button type="button" onClick={saveDefaults} disabled={savingDefaults}
                className="bg-teal-600 hover:bg-teal-700">
                {savingDefaults ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Default Plans'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


