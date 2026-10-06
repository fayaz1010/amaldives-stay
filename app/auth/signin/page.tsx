
'use client';

import { Suspense, useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Outcomes of /api/auth/verify (the "Confirm your email" link).
const VERIFY_NOTICES: Record<string, { kind: 'ok' | 'error'; text: string }> = {
  done: { kind: 'ok', text: 'Email verified — please sign in.' },
  expired: {
    kind: 'error',
    text: 'That confirmation link has expired. Sign in below and we will offer to send a new one.',
  },
  invalid: {
    kind: 'error',
    text: 'That confirmation link is not valid (it may already have been used). Try signing in; if your email still needs confirming we will offer a new link.',
  },
};

function SignInForm() {
  const searchParams = useSearchParams();
  const verify = searchParams?.get('verify') ?? '';
  const notice = VERIFY_NOTICES[verify];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResendState('idle');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'email_unverified') {
          setUnverified(true);
          setError(
            'Please confirm your email before signing in. Open the link in the "Confirm your email — Vayves" message we sent you.',
          );
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Get the session to determine redirect
        const session = await getSession();
        const role = session?.user?.role;

        if (role === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (role === 'GUEST') {
          router.push('/guest');
        } else if (role === 'TENANT_ADMIN' && !session?.user?.tenantId) {
          // Owner who signed up but hasn't created a property yet.
          router.push('/onboarding');
        } else {
          router.push('/admin');
        }
      }
    } catch (err) {
      setError('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendState('sending');
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // The reply is generic either way; nothing useful to show on failure.
    }
    setResendState('sent');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <img src="/images/logo.png" alt="Vayves" className="h-14 w-auto" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome to Vayves</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {notice && !error && (
            <Alert variant={notice.kind === 'error' ? 'destructive' : 'default'}>
              {notice.kind === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{notice.text}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {unverified && (
                  <span className="block mt-2">
                    {resendState === 'sent' ? (
                      'A new confirmation link is on its way — check your inbox and spam folder.'
                    ) : (
                      <button
                        type="button"
                        onClick={resend}
                        disabled={resendState === 'sending'}
                        className="underline font-medium"
                      >
                        {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
                      </button>
                    )}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Own a guesthouse and new to Vayves?{' '}
            <Link href="/auth/signup" className="text-cyan-600 hover:underline">
              Start your free 30-day trial
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
