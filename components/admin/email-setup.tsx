'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Plus, Copy } from 'lucide-react';

interface Rec {
  type: string;
  name: string;
  value: string;
  priority?: number;
  note?: string;
}
interface Mailbox {
  address: string;
  status: string;
}
interface State {
  domain: string | null;
  email: { provider: 'zoho' | 'google'; mailboxes: Mailbox[] } | null;
  records: Rec[];
}

export function EmailSetup() {
  const [state, setState] = useState<State | null>(null);
  const [provider, setProvider] = useState<'zoho' | 'google'>('zoho');
  const [local, setLocal] = useState('info');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/admin/email');
    const d = await r.json();
    setState(d);
    if (d?.email?.provider) setProvider(d.email.provider);
  }
  useEffect(() => {
    load();
  }, []);

  async function addMailbox() {
    if (!state?.domain) return;
    setBusy(true);
    setMsg(null);
    const address = `${local.trim().replace(/@.*/, '')}@${state.domain}`;
    const r = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, mailboxes: [address] }),
    });
    const d = await r.json();
    if (!r.ok) setMsg(d.error || 'Could not save');
    else {
      setState(d);
      setLocal('');
    }
    setBusy(false);
  }

  if (!state) return null;

  if (!state.domain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-cyan-600" /> Brand email
          </CardTitle>
          <CardDescription>Connect your domain above first — then add mailboxes like info@yourdomain.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-cyan-600" /> Brand email
        </CardTitle>
        <CardDescription>
          Professional email on your domain (you@{state.domain}). Choose a provider, request mailboxes, and add the DNS
          records below. We&apos;ll provision them within 24h.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'zoho' | 'google')}
            className="h-9 rounded-md border px-2 text-sm"
          >
            <option value="zoho">Zoho Mail (~$1/mailbox)</option>
            <option value="google">Google Workspace (~$7/mailbox)</option>
          </select>
          <div className="flex items-center">
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="info" className="w-28 rounded-r-none" />
            <span className="h-9 inline-flex items-center rounded-r-md border border-l-0 bg-gray-50 px-2 text-sm text-gray-500">
              @{state.domain}
            </span>
          </div>
          <Button onClick={addMailbox} disabled={busy || !local.trim()} className="bg-cyan-600 hover:bg-cyan-700 gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add mailbox
          </Button>
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {state.email?.mailboxes?.length ? (
          <div className="flex flex-wrap gap-2">
            {state.email.mailboxes.map((m) => (
              <Badge key={m.address} className="bg-gray-100 text-gray-800 gap-1">
                {m.address}
                <span className={m.status === 'active' ? 'text-green-600' : 'text-amber-600'}>· {m.status}</span>
              </Badge>
            ))}
          </div>
        ) : null}

        {state.records?.length > 0 && (
          <div className="rounded-lg border bg-gray-50 p-3 text-sm">
            <p className="mb-2 text-gray-700">Add these mail DNS records at your registrar (alongside the website record):</p>
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-1 pr-3">Type</th>
                  <th className="py-1 pr-3">Name</th>
                  <th className="py-1 pr-3">Priority</th>
                  <th className="py-1">Value</th>
                </tr>
              </thead>
              <tbody>
                {state.records.map((r, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="py-1 pr-3">{r.type}</td>
                    <td className="py-1 pr-3">{r.name}</td>
                    <td className="py-1 pr-3">{r.priority ?? '—'}</td>
                    <td className="py-1">
                      <div className="flex items-center gap-2">
                        <span className="break-all">{r.value}</span>
                        <button onClick={() => navigator.clipboard?.writeText(r.value)} title="Copy">
                          <Copy className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                      {r.note && <div className="text-[11px] text-gray-400">{r.note}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
