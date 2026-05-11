
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Hotel, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const guesthouseParam = searchParams?.get('guesthouse') ?? '';

  const initialName = useMemo(() => humanize(guesthouseParam), [guesthouseParam]);
  const initialSubdomain = useMemo(() => slugify(guesthouseParam), [guesthouseParam]);

  const [guesthouseName, setGuesthouseName] = useState(initialName);
  const [subdomain, setSubdomain] = useState(initialSubdomain);
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successUrl, setSuccessUrl] = useState('');

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
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || 'Unable to claim account. Please try again.');
        return;
      }

      setSuccessUrl(`https://${finalSubdomain}.stay.amaldives.com`);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successUrl) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">You're all set!</CardTitle>
          <CardDescription>
            Your amaldives STAY account is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Sign in at</p>
            <a
              href={successUrl}
              className="text-cyan-700 font-semibold break-all hover:underline"
            >
              {successUrl}
            </a>
          </div>
          <Link href="/auth/signin" className="block">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
              Go to sign in
            </Button>
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
        <CardTitle className="text-2xl font-bold">
          Claim Your Free amaldives STAY Account
        </CardTitle>
        <CardDescription>
          {guesthouseName
            ? `Your guesthouse ${guesthouseName} is listed on amaldives.com. Claim your account to accept direct bookings.`
            : 'Your guesthouse is listed on amaldives.com. Claim your account to accept direct bookings.'}
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
              Your URL will be{' '}
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

          <Button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700"
            disabled={loading}
          >
            {loading ? 'Claiming…' : 'Claim Free Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          By claiming, you agree to keep 96% of every direct booking. We collect a 4% platform fee to cover hosting and listing costs.
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
