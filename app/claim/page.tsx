
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Hotel, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ClaimForm() {
  const searchParams = useSearchParams();
  const guesthouseParam = searchParams?.get('guesthouse') ?? searchParams?.get('slug') ?? '';

  const initialSubdomain = useMemo(() => slugify(guesthouseParam), [guesthouseParam]);
  const initialName = useMemo(() => humanize(guesthouseParam), [guesthouseParam]);

  const [guesthouseName, setGuesthouseName] = useState(initialName);
  const [subdomain, setSubdomain] = useState(initialSubdomain);
  const [amaldivesUrl, setAmaldivesUrl] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    stayUrl: string;
    amaldivesUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!guesthouseParam) return;
    fetch(`/api/public/claim/lookup?slug=${encodeURIComponent(guesthouseParam)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.claimed) {
          setError(`This guesthouse is already claimed. Sign in at ${data.stayUrl}`);
          return;
        }
        if (data.name) setGuesthouseName(data.name);
        if (data.suggestedSubdomain) setSubdomain(data.suggestedSubdomain);
        if (data.amaldivesUrl) setAmaldivesUrl(data.amaldivesUrl);
      })
      .catch(() => {});
  }, [guesthouseParam]);

  useEffect(() => {
    setGuesthouseName(initialName);
    setSubdomain(initialSubdomain);
  }, [initialName, initialSubdomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!guesthouseName.trim()) {
      setError('Guesthouse name is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const finalSubdomain = slugify(subdomain || guesthouseName);
    if (!finalSubdomain) {
      setError('Could not derive a subdomain from the guesthouse name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/public/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guesthouseName,
          subdomain: finalSubdomain,
          email,
          name: ownerName || email.split('@')[0],
          password,
          amaldivesSlug: guesthouseParam || finalSubdomain,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Unable to claim account. Please try again.');
        return;
      }

      setSuccess({
        stayUrl: data.stayUrl ?? `https://${finalSubdomain}.stay.amaldives.com`,
        amaldivesUrl: data.amaldivesUrl,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">You&apos;re all set!</CardTitle>
          <CardDescription>
            Your account is linked to amaldives.com and ready for direct bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Manage bookings at</p>
            <a href={success.stayUrl} className="text-cyan-700 font-semibold break-all hover:underline">
              {success.stayUrl}
            </a>
          </div>
          {success.amaldivesUrl && (
            <a
              href={success.amaldivesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-cyan-700 hover:underline"
            >
              View your amaldives.com listing <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Link href="/auth/signin" className="block">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700">Sign in to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center">
            <Hotel className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Claim Your Free amaldives STAY Account</CardTitle>
        <CardDescription>
          {guesthouseParam ? (
            <>
              Your listing on{' '}
              <a
                href={amaldivesUrl || `https://www.amaldives.com/guesthouses/${guesthouseParam}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-700 hover:underline"
              >
                amaldives.com
              </a>{' '}
              will connect to direct bookings automatically.
            </>
          ) : (
            'Link your amaldives.com guesthouse and start accepting commission-free bookings.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="guesthouseName">Guesthouse name</Label>
            <Input
              id="guesthouseName"
              type="text"
              value={guesthouseName}
              onChange={(e) => setGuesthouseName(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Your URL:{' '}
              <span className="font-medium text-cyan-700">
                {slugify(subdomain || guesthouseName) || 'your-guesthouse'}.stay.amaldives.com
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Your name</Label>
            <Input
              id="ownerName"
              type="text"
              placeholder="Full name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Owner email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
            {loading ? 'Claiming…' : 'Claim Free Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          By claiming, you agree to keep 96% of every direct booking. We collect a 4% platform fee.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ClaimPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
        <ClaimForm />
      </Suspense>
    </div>
  );
}
