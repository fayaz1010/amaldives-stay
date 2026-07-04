'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronDown, ChevronUp, Mail, CheckCircle2, XCircle } from 'lucide-react';

interface SuggestedFinal {
  source: string;
  action: string;
  otaRef: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  checkIn: string | null;
  checkOut: string | null;
  roomHint: string | null;
  adults: number | null;
  children: number | null;
  amount: number | null;
}

interface Discrepancy {
  field: string;
  regexValue: unknown;
  aiValue: unknown;
}

export interface OtaReviewMessage {
  id: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  rawText: string | null;
  rawHtml: string | null;
  source: string;
  regexResult: unknown;
  aiResult: unknown;
  discrepancies: Discrepancy[];
  confidence: number | null;
  status: string;
  createdAt: string;
  suggested: { verified: boolean; confidence: number; final: SuggestedFinal | null; aiError?: string };
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function EmailBody({ text, html }: { text: string | null; html: string | null }) {
  const [open, setOpen] = useState(false);
  const preview = (text || (html || '').replace(/<[^>]+>/g, ' ')).slice(0, 220);
  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Raw email
      </button>
      {!open && <p className="mt-1 text-muted-foreground line-clamp-2">{preview}…</p>}
      {open && (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {text || html || '(empty)'}
        </pre>
      )}
    </div>
  );
}

function ReviewCard({ message, onResolved }: { message: OtaReviewMessage; onResolved: (id: string) => void }) {
  const router = useRouter();
  const suggested = message.suggested.final;
  const [form, setForm] = useState({
    source: suggested?.source ?? message.source,
    action: suggested?.action ?? 'new',
    otaRef: suggested?.otaRef ?? '',
    guestName: suggested?.guestName ?? '',
    guestEmail: suggested?.guestEmail ?? '',
    guestPhone: suggested?.guestPhone ?? '',
    checkIn: toDateInputValue(suggested?.checkIn ?? null),
    checkOut: toDateInputValue(suggested?.checkOut ?? null),
    roomHint: suggested?.roomHint ?? '',
    adults: suggested?.adults?.toString() ?? '',
    children: suggested?.children?.toString() ?? '',
    amount: suggested?.amount?.toString() ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(action: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      const body =
        action === 'reject'
          ? { action: 'reject' as const }
          : {
              action: 'approve' as const,
              overrides: {
                source: form.source,
                action: form.action,
                otaRef: form.otaRef,
                guestName: form.guestName || null,
                guestEmail: form.guestEmail || null,
                guestPhone: form.guestPhone || null,
                checkIn: form.checkIn || undefined,
                checkOut: form.checkOut || undefined,
                roomHint: form.roomHint || null,
                adults: form.adults ? parseInt(form.adults, 10) : undefined,
                children: form.children ? parseInt(form.children, 10) : undefined,
                amount: form.amount ? parseFloat(form.amount) : undefined,
              },
            };
      const res = await fetch(`/api/admin/ota-review/${message.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to ${action}`);
      onResolved(message.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`);
    } finally {
      setBusy(false);
    }
  }

  const confidencePct = Math.round((message.suggested.confidence ?? 0) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {message.subject || '(no subject)'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              From {message.fromAddress} → {message.toAddress} · {new Date(message.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="capitalize">{message.source}</Badge>
            <span className="text-xs text-muted-foreground">AI confidence: {confidencePct}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <EmailBody text={message.rawText} html={message.rawHtml} />

        {message.discrepancies.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-medium mb-1">Regex vs Gemini disagreed on:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {message.discrepancies.map((d, i) => (
                <li key={i}>
                  <span className="font-medium">{d.field}</span>: regex=&quot;{String(d.regexValue ?? '—')}&quot; vs AI=&quot;
                  {String(d.aiValue ?? '—')}&quot;
                </li>
              ))}
            </ul>
          </div>
        )}
        {message.suggested.aiError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900">
            Gemini verification failed: {message.suggested.aiError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">OTA reference</Label>
            <Input value={form.otaRef} onChange={(e) => set('otaRef', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.action}
              onChange={(e) => set('action', e.target.value)}
            >
              <option value="new">New</option>
              <option value="modified">Modified</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Check-in</Label>
            <Input type="date" value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Check-out</Label>
            <Input type="date" value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Guest name</Label>
            <Input value={form.guestName} onChange={(e) => set('guestName', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Guest email</Label>
            <Input value={form.guestEmail} onChange={(e) => set('guestEmail', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Guest phone</Label>
            <Input value={form.guestPhone} onChange={(e) => set('guestPhone', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Room</Label>
            <Input value={form.roomHint} onChange={(e) => set('roomHint', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Adults</Label>
            <Input type="number" min={1} value={form.adults} onChange={(e) => set('adults', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Children</Label>
            <Input type="number" min={0} value={form.children} onChange={(e) => set('children', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => submit('approve')} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve &amp; create booking
          </Button>
          <Button variant="outline" onClick={() => submit('reject')} disabled={busy} className="gap-1.5">
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OtaReviewQueue({
  initialMessages,
  counts,
}: {
  initialMessages: OtaReviewMessage[];
  counts: Record<string, number>;
}) {
  const [messages, setMessages] = useState(initialMessages);

  const resolved = useMemo(() => new Set<string>(), []);
  function handleResolved(id: string) {
    resolved.add(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Needs review: {counts.NEEDS_REVIEW ?? 0}</Badge>
        <Badge variant="outline">Auto-created: {(counts.CREATED ?? 0) + (counts.UPDATED ?? 0)}</Badge>
        <Badge variant="outline">Cancelled: {counts.CANCELLED ?? 0}</Badge>
        <Badge variant="outline">Rejected: {counts.REJECTED ?? 0}</Badge>
        <Badge variant="outline">Failed: {counts.FAILED ?? 0}</Badge>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nothing waiting for review. Every OTA email Gemini was confident about has already become a booking.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <ReviewCard key={m.id} message={m} onResolved={handleResolved} />
          ))}
        </div>
      )}
    </div>
  );
}
