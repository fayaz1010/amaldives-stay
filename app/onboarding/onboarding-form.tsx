'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function OnboardingForm() {
  const { update } = useSession();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/add-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guesthouseName: name.trim(),
          subdomain: subdomain || slugify(name),
          onboarding: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Could not create your property');
      // Refresh the session so it carries the new tenant and owner role,
      // then continue on this host (session cookies are host-only).
      await update();
      window.location.href = '/admin/settings/billing?welcome=1';
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setLoading(false);
    }
  }

  const finalSubdomain = subdomain || slugify(name) || 'your-guesthouse';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="gh-name" className="block text-xs font-medium text-gray-700 mb-1">
          Guesthouse name <span className="text-red-500">*</span>
        </label>
        <input
          id="gh-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!subdomainEdited) setSubdomain(slugify(e.target.value));
          }}
          required
          placeholder="Reef View Guesthouse"
          className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div>
        <label htmlFor="gh-sub" className="block text-xs font-medium text-gray-700 mb-1">
          Web address <span className="text-red-500">*</span>
        </label>
        <div className="flex items-stretch text-sm rounded border border-gray-300 focus-within:ring-2 focus-within:ring-teal-500 overflow-hidden">
          <input
            id="gh-sub"
            type="text"
            value={subdomain}
            onChange={(e) => {
              setSubdomainEdited(true);
              setSubdomain(slugify(e.target.value));
            }}
            required
            pattern="[a-z0-9-]{3,40}"
            placeholder="reef-view"
            className="flex-1 min-w-0 px-3 py-2 text-sm font-mono focus:outline-none"
          />
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-xs font-mono border-l border-gray-300 flex items-center">
            .vayves.com
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Your booking site will be{' '}
          <span className="font-mono text-teal-700">{finalSubdomain}.vayves.com</span>. You can
          connect your own domain later.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Creating your property…' : 'Create property and continue'}
      </button>
    </form>
  );
}
