'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { tenantUrl } from '@/lib/domain';

interface Props {
  token: string;
  email: string;
  subdomain?: string;
}

export function AcceptInviteForm({ token, email, subdomain }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\'t match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Could not accept invite');

      // Sign in with the new password — NextAuth credentials provider.
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        setError('Account set up, but sign-in failed. Please sign in manually.');
        setTimeout(() => router.push('/auth/signin'), 2000);
        return;
      }

      // Hard navigation to /admin on the correct subdomain so the JWT
      // hydrates with the right tenant context.
      const target = subdomain
        ? tenantUrl(subdomain, '/admin')
        : '/admin';
      window.location.href = target;
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full px-3 py-2 rounded border border-gray-200 bg-gray-50 text-sm text-gray-600"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          New password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Confirm password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Setting up…' : 'Set password and sign in'}
      </button>
    </form>
  );
}
