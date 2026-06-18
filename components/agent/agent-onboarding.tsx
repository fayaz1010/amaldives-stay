'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Users, Percent, BookOpen, Loader2 } from 'lucide-react';

interface AgentOnboardingProps {
  agencyName: string;
  markupPercent: number;
  onComplete: () => void;
}

const TOTAL = 3;

export function AgentOnboarding({ agencyName, markupPercent, onComplete }: AgentOnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  async function finish() {
    setLoading(true);
    try {
      await fetch('/api/agent/onboarding', { method: 'POST' });
    } catch {
      // best-effort
    } finally {
      setLoading(false);
      onComplete();
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Step {step} of {TOTAL}</span>
            <span>{Math.round((step / TOTAL) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${(step / TOTAL) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 text-center py-6">
            <Users className="h-14 w-14 text-teal-600 mx-auto" />
            <h1 className="text-2xl font-bold">Welcome, {agencyName}</h1>
            <p className="text-gray-600">
              Book guesthouses on contracted B2B rates — rack ± your agency markup, confirmed instantly in STAY.
            </p>
            <Button className="w-full min-h-12 bg-teal-600" onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Percent className="h-5 w-5 text-teal-600" />
              Your contracted rates
            </h2>
            <p className="text-sm text-gray-600">
              Your agency pays <strong>rack rate {markupPercent >= 0 ? '+' : ''}{markupPercent}%</strong> on each
              booking. Example: rack $100/night → you pay ${(100 * (1 + markupPercent / 100)).toFixed(0)}/night.
            </p>
            <p className="text-xs text-gray-500">
              Rack is the published card rate set by the property. Sell rates on the public site may be lower when
              promotions apply — agent rates always anchor on rack.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 min-h-12" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1 min-h-12 bg-teal-600" onClick={() => setStep(3)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" />
              How to book
            </h2>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Pick check-in and check-out dates, then search availability.</li>
              <li>Select a room — agent total shows rack ± your markup.</li>
              <li>Enter guest name and email; confirmation is issued immediately.</li>
            </ol>
            <Button
              className="w-full min-h-12 bg-teal-600"
              onClick={finish}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start booking'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
