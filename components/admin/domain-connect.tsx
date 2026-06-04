'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Copy } from 'lucide-react';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}
interface Status {
  domain: string | null;
  subdomain?: string | null;
  verified?: boolean;
  records?: DnsRecord[];
  misconfigured?: boolean;
  error?: string;
}

export function DomainConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/domain');
    setStatus(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function connect() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: input }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error || 'Could not connect domain');
      else {
        setStatus(data);
        setInput('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect this domain? The site will stay live on your stay.amaldives.com address.')) return;
    setBusy(true);
    await fetch('/api/admin/domain', { method: 'DELETE' });
    await load();
    setBusy(false);
  }

  const subdomainUrl = status?.subdomain ? `${status.subdomain}.stay.amaldives.com` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-cyan-600" /> Your website domain
        </CardTitle>
        <CardDescription>
          Your booking website is always live at{' '}
          {subdomainUrl ? (
            <a className="text-cyan-700 font-medium" href={`https://${subdomainUrl}`} target="_blank" rel="noreferrer">
              {subdomainUrl}
            </a>
          ) : (
            'your stay.amaldives.com address'
          )}
          . Connect your own domain (e.g. <span className="font-mono">yourguesthouse.com</span>) to use it instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.domain && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="yourguesthouse.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <Button onClick={connect} disabled={busy || !input.trim()} className="bg-cyan-600 hover:bg-cyan-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect domain'}
            </Button>
          </div>
        )}
        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {status?.domain && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{status.domain}</span>
              {status.verified ? (
                <Badge className="bg-green-100 text-green-800 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Live
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 gap-1">
                  <AlertTriangle className="h-3 w-3" /> Pending DNS
                </Badge>
              )}
              <Button size="sm" variant="ghost" onClick={load} disabled={busy} title="Refresh status">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={disconnect} disabled={busy}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {!status.verified && (status.records?.length ?? 0) > 0 && (
              <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                <p className="mb-2 text-gray-700">
                  Add these records at your domain registrar (GoDaddy, Namecheap, etc.). It can take a few minutes to a
                  few hours to verify.
                </p>
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="py-1 pr-3">Type</th>
                      <th className="py-1 pr-3">Name</th>
                      <th className="py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.records!.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1 pr-3">{r.type}</td>
                        <td className="py-1 pr-3">{r.name}</td>
                        <td className="py-1 flex items-center gap-2">
                          {r.value}
                          <button onClick={() => navigator.clipboard?.writeText(r.value)} title="Copy">
                            <Copy className="h-3 w-3 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {status.error && <p className="text-xs text-amber-600">Status note: {status.error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
