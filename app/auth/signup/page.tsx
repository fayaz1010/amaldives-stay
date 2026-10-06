
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Hotel, Eye, EyeOff, AlertCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import { TurnstileWidget } from '@/components/turnstile-widget';

function SignUpForm() {
  const searchParams = useSearchParams();
  // Owner sign-up by default; /auth/signup?type=guest is the guest variant.
  const isGuest = searchParams?.get('type') === 'guest';
  const [sentTo, setSentTo] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [challengeReset, setChallengeReset] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          turnstileToken,
          accountType: isGuest ? 'guest' : 'owner',
        }),
      });

      if (response.ok) {
        setSentTo(formData.email.trim());
      } else {
        const data = await response.json();
        setError(data.message || 'An error occurred');
        // Turnstile tokens are single-use, so a retry needs a fresh challenge.
        setChallengeReset((n) => n + 1);
      }
    } catch (err) {
      setError('An error occurred during sign up');
      setChallengeReset((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (sentTo) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Check your inbox to confirm your email</CardTitle>
          <CardDescription>
            We sent a link to <strong>{sentTo}</strong> (subject: &ldquo;Confirm your email &mdash; Vayves&rdquo;).
            Open it to activate your account, then sign in
            {isGuest ? '.' : ' to set up your guesthouse and start your 30-day free trial.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 text-center">
            The link expires in 24 hours. Check your spam folder if it hasn&apos;t arrived in a few minutes.
          </p>
          <Link href="/auth/signin" className="block">
            <Button variant="outline" className="w-full">I&apos;ve confirmed &mdash; sign in</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center">
              <Hotel className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isGuest ? 'Create Account' : 'Start your free 30-day trial'}
          </CardTitle>
          <CardDescription>
            {isGuest
              ? 'Create a guest account to manage your stays'
              : 'Create your owner account, confirm your email, then set up your guesthouse. Growth plan US$19/month after the trial; your card is saved when you start the trial and you can cancel any time before it ends.'}
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <TurnstileWidget onToken={setTurnstileToken} resetSignal={challengeReset} />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : isGuest ? 'Create Account' : 'Create owner account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-teal-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </CardContent>
      </Card>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
