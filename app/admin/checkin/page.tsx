'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, Key, User } from 'lucide-react';

type ScanResult = {
  mode: string;
  booking?: {
    confirmationNumber?: string;
    status?: string;
    guest?: { name?: string | null; email?: string };
    room?: { number?: string; name?: string | null };
    keysIssued?: boolean;
    checkedInAt?: string | null;
  };
  houseRules?: string;
  keyHandoffMessage?: string;
  keysIssued?: boolean;
  message?: string;
  allowFpos?: boolean;
};

export default function InstantCheckInPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get('code');
    if (fromQuery) setCode(fromQuery);
  }, [searchParams]);

  async function scan(issueKeys = false) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/checkin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), issueKeys }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setResult(data as ScanResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-7 w-7 text-teal-600" />
          Instant check-in
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan or type the guest&apos;s check-in code, confirmation number, or checkout code.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Code</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CI-XXXXXX or confirmation #"
          className="min-h-12 text-lg font-mono uppercase"
          onKeyDown={(e) => e.key === 'Enter' && scan()}
        />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1 min-h-12 bg-teal-600" disabled={loading || !code.trim()} onClick={() => scan(false)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check in'}
        </Button>
        <Button
          variant="outline"
          className="min-h-12"
          disabled={loading || !code.trim()}
          onClick={() => scan(true)}
        >
          <Key className="h-4 w-4 mr-1" /> Keys
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={result.mode === 'checkout' ? 'secondary' : 'default'}>
              {result.mode === 'checkout' ? 'Checkout' : 'Check-in'}
            </Badge>
            {result.booking?.status && (
              <span className="text-xs text-gray-500">{result.booking.status}</span>
            )}
          </div>
          {result.booking?.guest && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{result.booking.guest.name || result.booking.guest.email}</span>
            </div>
          )}
          {result.booking?.room?.number && (
            <p className="text-lg font-bold text-teal-700">Room {result.booking.room.number}</p>
          )}
          {result.booking?.confirmationNumber && (
            <p className="text-xs font-mono text-gray-500">{result.booking.confirmationNumber}</p>
          )}
          {result.mode === 'checkin' && (
            <>
              {result.keysIssued ? (
                <p className="text-sm text-green-700 flex items-center gap-1">
                  <Key className="h-4 w-4" /> Keys marked issued
                </p>
              ) : (
                <p className="text-sm text-amber-700">{result.keyHandoffMessage}</p>
              )}
              {result.houseRules && (
                <div className="text-xs text-gray-600 border rounded p-3 bg-gray-50 whitespace-pre-wrap max-h-40 overflow-auto">
                  {result.houseRules}
                </div>
              )}
            </>
          )}
          {result.mode === 'checkout' && (
            <p className="text-sm text-gray-700">
              {result.message}
              {result.allowFpos && ' · FPOS enabled'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
