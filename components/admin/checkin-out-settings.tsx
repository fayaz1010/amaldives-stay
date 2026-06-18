'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, QrCode } from 'lucide-react';
import { getCheckInOutConfig, type CheckInOutConfig } from '@/lib/checkin-out-config';

interface CheckInOutSettingsProps {
  tenant: {
    subdomain: string;
    settings?: unknown;
  };
}

export function CheckInOutSettings({ tenant }: CheckInOutSettingsProps) {
  const router = useRouter();
  const initial = getCheckInOutConfig(tenant.settings);
  const baseSettings = (tenant.settings as Record<string, unknown>) ?? {};

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [instantCheckInEnabled, setInstantCheckInEnabled] = useState(initial.instantCheckInEnabled ?? true);
  const [sendQrHoursBeforeCheckIn, setSendQrHoursBeforeCheckIn] = useState(
    String(initial.sendQrHoursBeforeCheckIn ?? 24),
  );
  const [houseRulesMarkdown, setHouseRulesMarkdown] = useState(initial.houseRulesMarkdown ?? '');
  const [keyHandoffMessage, setKeyHandoffMessage] = useState(initial.keyHandoffMessage ?? '');
  const [requireStaffScanForKeys, setRequireStaffScanForKeys] = useState(
    initial.requireStaffScanForKeys ?? true,
  );
  const [checkoutHoursBeforeDeparture, setCheckoutHoursBeforeDeparture] = useState(
    String(initial.checkoutHoursBeforeDeparture ?? 4),
  );
  const [allowInAppCheckoutPay, setAllowInAppCheckoutPay] = useState(
    initial.allowInAppCheckoutPay ?? true,
  );
  const [allowFposAtDesk, setAllowFposAtDesk] = useState(initial.allowFposAtDesk ?? true);
  const [whatsappCheckInReminder, setWhatsappCheckInReminder] = useState(
    initial.whatsappCheckInReminder ?? true,
  );

  async function save() {
    setSaving(true);
    const checkInOut: CheckInOutConfig = {
      instantCheckInEnabled,
      sendQrHoursBeforeCheckIn: Number(sendQrHoursBeforeCheckIn) || 24,
      houseRulesMarkdown,
      keyHandoffMessage,
      requireStaffScanForKeys,
      checkoutHoursBeforeDeparture: Number(checkoutHoursBeforeDeparture) || 4,
      allowInAppCheckoutPay,
      allowFposAtDesk,
      whatsappCheckInReminder,
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { ...baseSettings, checkInOut },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      alert('Could not save check-in/out settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-teal-600" />
          Instant check-in & checkout
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          QR codes, key handoff, compiled checkout bill, and desk vs app payment options.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={instantCheckInEnabled}
              onChange={(e) => setInstantCheckInEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Enable instant QR check-in</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Send QR reminder (hours before check-in)</Label>
              <Input
                type="number"
                min={0}
                value={sendQrHoursBeforeCheckIn}
                onChange={(e) => setSendQrHoursBeforeCheckIn(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer sm:mt-8">
              <input
                type="checkbox"
                checked={requireStaffScanForKeys}
                onChange={(e) => setRequireStaffScanForKeys(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">Staff must scan before keys are marked issued</span>
            </label>
          </div>
          <div className="space-y-2">
            <Label>Key handoff message (shown in guest app)</Label>
            <Input value={keyHandoffMessage} onChange={(e) => setKeyHandoffMessage(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>House rules (markdown — overrides property policies if set)</Label>
            <Textarea
              rows={5}
              value={houseRulesMarkdown}
              onChange={(e) => setHouseRulesMarkdown(e.target.value)}
              placeholder="Quiet hours, smoking policy, Wi‑Fi password…"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappCheckInReminder}
              onChange={(e) => setWhatsappCheckInReminder(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">WhatsApp check-in reminder (when configured)</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Compile bill (hours before checkout time)</Label>
            <Input
              type="number"
              min={0}
              value={checkoutHoursBeforeDeparture}
              onChange={(e) => setCheckoutHoursBeforeDeparture(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Guest receives checkout QR and final folio when within this window (default checkout 11:00).
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowInAppCheckoutPay}
              onChange={(e) => setAllowInAppCheckoutPay(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Allow balance payment in guest app (Stripe)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowFposAtDesk}
              onChange={(e) => setAllowFposAtDesk(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Allow FPOS / pay at desk after checkout scan</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" /> Saved
          </span>
        )}
        <Button type="button" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save check-in/out settings'}
        </Button>
      </div>
    </div>
  );
}
