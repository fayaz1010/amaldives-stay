
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Hotel, AlertCircle, CheckCircle2, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'email' | 'sent' | 'password' | 'success' | 'blocked';

function ClaimForm() {
  const searchParams = useSearchParams();
  const guesthouseParam = searchParams?.get('guesthouse') ?? searchParams?.get('slug') ?? '';
  const tokenParam = searchParams?.get('token') ?? '';

  const [guesthouseName, setGuesthouseName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [amaldivesUrl, setAmaldivesUrl] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [claimToken, setClaimToken] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ stayUrl: string; amaldivesUrl?: string | null } | null>(null);

  useEffect(() => {
    if (!guesthouseParam) return;
    fetch(`/api/public/claim/lookup?slug=${encodeURIComponent(guesthouseParam)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setGuesthouseName(data.name);
        if (data.subdomain) setSubdomain(data.subdomain);
        if (data.amaldivesUrl) setAmaldivesUrl(data.amaldivesUrl);
        if (data.emailHint) setEmailHint(data.emailHint);
        if (data.claimed) {
          setError(`Already claimed — sign in at ${data.stayUrl}`);
          setStep('blocked');
        } else if (data.canClaim === false && data.error) {
          setError(data.error);
          setStep('blocked');
        }
      })
      .catch(() => {});
  }, [guesthouseParam]);

  useEffect(() => {
    if (!tokenParam || !guesthouseParam) return;
    setLoading(true);
    fetch(`/api/public/claim/verify?token=${encodeURIComponent(tokenParam)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) {
          setError(data.error || 'Invalid verification link');
          setStep('email');
          return;
        }
        setVerifiedEmail(data.email);
        setEmail(data.email);
        setGuesthouseName(data.guesthouseName || guesthouseName);
        setSubdomain(data.subdomain || subdomain);
        setClaimToken(tokenParam);
        setStep('password');
      })
      .catch(() => setError('Could not verify link'))
      .finally(() => setLoading(false));
  }, [tokenParam, guesthouseParam]);

  const handleRequestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!guesthouseParam) {
      setError('Missing guesthouse — use the link from your amaldives.com listing');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/public/claim/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: guesthouseParam, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not send verification email');
        if (data?.hint) setEmailHint(data.hint);
        return;
      }
      setStep('sent');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/public/claim/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: claimToken,
          password,
          ownerName: ownerName || verifiedEmail.split('@')[0],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Unable to complete claim');
        return;
      }
      setSuccess({
        stayUrl: data.stayUrl,
        amaldivesUrl: data.amaldivesUrl,
      });
      setStep('success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success' && success) {
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
            Your verified account is linked to amaldives.com and ready for direct bookings.
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

  if (step === 'sent') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{email}</strong>. Click it to set your password and
            activate admin access for <strong>{guesthouseName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center mb-4">
            The link expires in 24 hours. Check spam if you don&apos;t see it within a few minutes.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setStep('email')}>
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'password') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email verified</CardTitle>
          <CardDescription>
            Set a password for <strong>{verifiedEmail}</strong> to finish claiming{' '}
            <strong>{guesthouseName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComplete} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your name</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
              {loading ? 'Creating account…' : 'Activate admin access'}
            </Button>
          </form>
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
          {guesthouseName ? `Claim ${guesthouseName}` : 'Claim your guesthouse'}
        </CardTitle>
        <CardDescription>
          {guesthouseParam ? (
            <>
              Verify ownership with your business email. We auto-set up your STAY account from your{' '}
              <a
                href={amaldivesUrl || `https://www.amaldives.com/guesthouses/${guesthouseParam}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-700 hover:underline"
              >
                amaldives.com
              </a>{' '}
              listing — no manual approval needed.
            </>
          ) : (
            'Open this page from your amaldives.com listing to claim automatically.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'blocked' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleRequestEmail} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {emailHint && (
              <p className="text-sm text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
                {emailHint}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Business email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourguesthouse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!guesthouseParam}
              />
              <p className="text-xs text-gray-500">
                Must match your guesthouse website domain (e.g. @rivethibeach.mv). Gmail and other
                personal emails are not accepted unless that exact address is on file.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              disabled={loading || !guesthouseParam}
            >
              {loading ? 'Sending…' : 'Send verification email'}
            </Button>
          </form>
        )}

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
