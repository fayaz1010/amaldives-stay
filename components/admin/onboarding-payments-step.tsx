'use client';

import { Label } from '@/components/ui/label';
import { CreditCard, CheckCircle2 } from 'lucide-react';

interface OnboardingPaymentsStepProps {
  stripePlatformConfigured: boolean;
  stripeEnabled: boolean;
  payAtProperty: boolean;
  currency: 'USD' | 'MVR';
  onStripeEnabled: (v: boolean) => void;
  onPayAtProperty: (v: boolean) => void;
  onCurrency: (v: 'USD' | 'MVR') => void;
}

export function OnboardingPaymentsStep({
  stripePlatformConfigured,
  stripeEnabled,
  payAtProperty,
  currency,
  onStripeEnabled,
  onPayAtProperty,
  onCurrency,
}: OnboardingPaymentsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-teal-600" />
          Accept online payments
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Stripe is built in — enable card checkout for guests booking on your stay page or amaldives.com.
        </p>
      </div>

      {stripePlatformConfigured ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex gap-2 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>
            Stripe is active on this server. Turn on card payments below — guests pay securely at booking time.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Stripe keys are not on this environment yet. You can still take <strong>pay at property</strong> bookings;
          contact amaldives support to enable Stripe in production.
        </div>
      )}

      <div className="space-y-2">
        <Label>Checkout currency</Label>
        <select
          value={currency}
          onChange={(e) => onCurrency(e.target.value as 'USD' | 'MVR')}
          className="w-full border rounded-lg px-3 py-2.5 text-sm min-h-12"
        >
          <option value="USD">USD — US Dollar</option>
          <option value="MVR">MVR — Maldivian Rufiyaa</option>
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 bg-white">
        <input
          type="checkbox"
          checked={stripeEnabled}
          disabled={!stripePlatformConfigured}
          onChange={(e) => onStripeEnabled(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded"
        />
        <span>
          <span className="text-sm font-medium text-gray-900">Accept cards via Stripe</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Visa / Mastercard — recommended for international guests
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 bg-white">
        <input
          type="checkbox"
          checked={payAtProperty}
          onChange={(e) => onPayAtProperty(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded"
        />
        <span>
          <span className="text-sm font-medium text-gray-900">Pay at property</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Confirm booking without online payment — guest pays on arrival
          </span>
        </span>
      </label>
    </div>
  );
}
