
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Hotel, AlertCircle, CheckCircle2, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TurnstileWidget } from '@/components/turnstile-widget';

type Step = 'email' | 'sent' | 'password' | 'success' | 'blocked' | 'assist' | 'assistSent';

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
  const [assistName, setAssistName] = useState('');
  const [assistPhone, setAssistPhone] = useState('');
  const [assistMessage, setAssistMessage] = useState('');
  // Visitors who arrive at a bare /claim (organic, WhatsApp, a shared link)
  // have no listing slug, so they have to tell us which property they own.
  const [assistProperty, setAssistProperty] = useState('');
  const [assistToken, setAssistToken] = useState('');
  const [assistChallengeReset, setAssistChallengeReset] = useState(0);
  const [canAssist, setCanAssist] = useState(false);

  // Without a listing slug the email step is unusable: its input and its submit
  // button are both disabled. Every CTA on the site links to a bare /claim, so
  // organic, WhatsApp and shared traffic all landed on a dead form — on the one
  // product we are actively selling. Derive the step instead of storing it, so
  // a slug-less visitor gets the open lead form (same endpoint, still persists
  // and still notifies) without a hydration mismatch or a flash of the old UI.
  const effectiveStep: Step = !guesthouseParam && step === 'email' ? 'assist' : step;


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
          setError(data.stayUrl ? `Already claimed — sign in at ${data.stayUrl}` : 'Already claimed — sign in instead.');
          setStep('blocked');
        } else if (data.canClaim === false && data.error) {
          setError(data.error);
          setCanAssist(Boolean(data.canRequestAssist));
          setStep('blocked');
        } else {
          setCanAssist(true);
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

  const handleAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/public/claim/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The API requires a slug. Visitors with no listing link get a
          // sentinel one so the request still persists and still notifies —
          // staff match it to a property from the name/phone they gave.
          slug: guesthouseParam || 'unlisted-enquiry',
          propertyName: guesthouseName || assistProperty,
          email,
          contactName: assistName,
          phone: assistPhone,
          message: assistMessage,
          turnstileToken: assistToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || data?.message || 'Could not submit the request. Try again shortly.');
        // Turnstile tokens are single-use, so a retry needs a fresh challenge.
        setAssistChallengeReset((n) => n + 1);
        return;
      }
      setStep('assistSent');
    } catch {
      setError('Network error. Please try again.');
      setAssistChallengeReset((n) => n + 1);
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
          <CardTitle className="text-2xl font-bold">Account verified!</CardTitle>
          <CardDescription>
            One more step: set up your 30-day free trial to activate your Vayves account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Growth plan — $19/month</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✓ Free for 30 days</li>
              <li>✓ Channel sync to Booking.com, Agoda & Airbnb</li>
              <li>✓ SMS notifications</li>
              <li>✓ Cancel anytime before trial ends — no charge</li>
            </ul>
          </div>
          <Link href="/auth/signin" className="block">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700">Continue to billing setup</Button>
          </Link>
          <p className="text-xs text-gray-500 text-center">
            Your card will be collected but not charged for 30 days. Cancel anytime from your billing settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (effectiveStep === 'assistSent') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Request received</CardTitle>
          <CardDescription>
            Our team will call or WhatsApp you to verify ownership of{' '}
            <strong>{guesthouseName || guesthouseParam}</strong> — usually within 1 business day.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (effectiveStep === 'assist') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify another way</CardTitle>
          <CardDescription>
            {guesthouseParam ? (
              <>
                Can&apos;t use the email on file? Leave your details and our team verifies ownership of{' '}
                <strong>{guesthouseName || guesthouseParam}</strong> by phone — free, no obligation.
              </>
            ) : (
              <>Leave your details and our team verifies ownership by phone — free, no obligation.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssist} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="assistName">Your name</Label>
              <Input id="assistName" value={assistName} onChange={(e) => setAssistName(e.target.value)} required />
            </div>
            {!guesthouseParam && (
              <div className="space-y-2">
                <Label htmlFor="assistProperty">Property name</Label>
                <Input
                  id="assistProperty"
                  value={assistProperty}
                  onChange={(e) => setAssistProperty(e.target.value)}
                  placeholder="e.g. Rivethi Beach"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="assistEmail">Email</Label>
              <Input
                id="assistEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistPhone">Phone / WhatsApp</Label>
              <Input
                id="assistPhone"
                value={assistPhone}
                onChange={(e) => setAssistPhone(e.target.value)}
                placeholder="+960 …"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistMessage">Anything we should know? (optional)</Label>
              <Input
                id="assistMessage"
                value={assistMessage}
                onChange={(e) => setAssistMessage(e.target.value)}
                placeholder="e.g. our listed email is out of date"
              />
            </div>
            <TurnstileWidget onToken={setAssistToken} resetSignal={assistChallengeReset} />
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
              {loading ? 'Submitting…' : 'Request manual verification'}
            </Button>
            {guesthouseParam && (
              <Button type="button" variant="outline" className="w-full" onClick={() => setStep('email')}>
                Back
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    );
  }

  if (effectiveStep === 'sent') {
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

  if (effectiveStep === 'password') {
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
              Verify ownership with your business email. We auto-set up your Vayves account from your{' '}
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
        {effectiveStep === 'blocked' ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {canAssist && (
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={() => setStep('assist')}>
                Request manual verification
              </Button>
            )}
          </div>
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

            {guesthouseParam && (
              <button
                type="button"
                onClick={() => setStep('assist')}
                className="w-full text-center text-sm text-cyan-700 hover:underline"
              >
                Can&apos;t use that email? Request manual verification
              </button>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-500">
          By claiming, you start a 30-day free trial. Card will be collected during setup. You'll be charged $19/month after the trial unless you cancel.
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
