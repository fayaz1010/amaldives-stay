'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Users, Copy, Check, Mail } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AgencyRow {
  id: string;
  name: string;
  markupPercent: number;
  creditTerms: string | null;
  isActive: boolean;
  members: Array<{ user: { email: string; name: string | null } }>;
  _count: { bookings: number };
}

export function AgenciesManager() {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    markupPercent: '0',
    creditTerms: '',
    agentEmail: '',
    agentName: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{
    url: string;
    emailSent: boolean;
    emailReason?: string | null;
    agencyName?: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agencies', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setAgencies(data.agencies || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!form.name.trim()) {
      setError('Agency name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          markupPercent: Number(form.markupPercent),
          creditTerms: form.creditTerms.trim() || null,
          agentEmail: form.agentEmail.trim() || null,
          agentName: form.agentName.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      if (data.invite) {
        setLastInvite({
          url: data.invite.url,
          emailSent: data.invite.emailSent,
          emailReason: data.invite.emailReason,
          agencyName: data.agency?.name,
        });
      }
      setSheetOpen(false);
      setForm({ name: '', markupPercent: '0', creditTerms: '', agentEmail: '', agentName: '' });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            Travel agents (B2B)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent rates are rack ± markup %. Agents book via the agent portal at their contracted rate.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" /> Add agency
        </Button>
      </div>

      {lastInvite && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-2">
          <p className="text-sm font-medium text-teal-900">
            Agent invite link {lastInvite.agencyName ? `— ${lastInvite.agencyName}` : ''}
          </p>
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <code className="text-xs flex-1 break-all text-teal-800">{lastInvite.url}</code>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-100"
              onClick={async () => {
                await navigator.clipboard.writeText(lastInvite.url);
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 2000);
              }}
            >
              {copiedInvite ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-teal-800">
            {lastInvite.emailSent
              ? 'Invite email sent.'
              : `Email not sent — share link manually (${lastInvite.emailReason ?? 'no mailer'})`}
          </p>
        </div>
      )}

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-teal-500 mx-auto" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agencies.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 bg-white space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{a.name}</h2>
                  <p className="text-sm text-gray-500">
                    Rack {a.markupPercent >= 0 ? '+' : ''}{a.markupPercent}%
                  </p>
                </div>
                <Badge variant={a.isActive ? 'default' : 'secondary'}>
                  {a.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {a.creditTerms && (
                <p className="text-xs text-gray-500">Terms: {a.creditTerms}</p>
              )}
              <p className="text-xs text-gray-400">{a._count.bookings} bookings</p>
              {a.members.length > 0 && (
                <ul className="text-xs text-gray-600">
                  {a.members.map((m) => (
                    <li key={m.user.email}>{m.user.name || m.user.email}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New travel agency</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Agency name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Markup on rack (%)</Label>
              <Input
                type="number"
                value={form.markupPercent}
                onChange={(e) => setForm({ ...form, markupPercent: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">+10 = agent pays 110% of rack; -5 = 5% below rack.</p>
            </div>
            <div>
              <Label>Credit terms (optional)</Label>
              <Input value={form.creditTerms} onChange={(e) => setForm({ ...form, creditTerms: e.target.value })} />
            </div>
            <div>
              <Label>Primary agent email</Label>
              <Input value={form.agentEmail} onChange={(e) => setForm({ ...form, agentEmail: e.target.value })} />
            </div>
            <div>
              <Label>Agent name</Label>
              <Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full bg-teal-600 hover:bg-teal-700" disabled={saving} onClick={create}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create agency'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
