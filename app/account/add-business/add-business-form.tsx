'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AddBusinessForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ subdomain: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/add-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guesthouseName: name,
          subdomain: subdomain || slugify(name),
          makeDefault,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to create business');
      setSuccess({ subdomain: j.subdomain });
      // Brief delay then hard-redirect to the new tenant's admin so the
      // session cookie hydrates the right tenantId.
      setTimeout(() => {
        window.location.href = `https://${j.subdomain}.vayves.com/admin`;
      }, 1500);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-700" />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">Business created</h3>
        <p className="text-sm text-gray-600">
          Redirecting to{' '}
          <span className="font-mono text-teal-700">
            {success.subdomain}.vayves.com/admin
          </span>
          …
        </p>
      </div>
    );
  }

  const finalSubdomain = subdomain || slugify(name) || 'your-guesthouse';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Guesthouse / business name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!subdomain) setSubdomain(slugify(e.target.value));
          }}
          required
          placeholder="Reef View Stay"
          className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Subdomain <span className="text-red-500">*</span>
        </label>
        <div className="flex items-stretch text-sm rounded border border-gray-300 focus-within:ring-2 focus-within:ring-teal-500 overflow-hidden">
          <input
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(slugify(e.target.value))}
            required
            pattern="[a-z0-9-]+"
            placeholder="reef-view-stay"
            className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none"
          />
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-xs font-mono border-l border-gray-300 flex items-center">
            .vayves.com
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Your admin will be at{' '}
          <span className="font-mono text-teal-700">
            {finalSubdomain}.vayves.com/admin
          </span>
        </p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-xs text-gray-700">
          Make this my default business (the one I land on after signing in)
        </span>
      </label>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Creating…' : 'Create business'}
      </button>
    </form>
  );
}
