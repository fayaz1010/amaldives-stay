import { tenantUrl } from '@/lib/domain';

export interface CheckInOutConfig {
  instantCheckInEnabled?: boolean;
  sendQrHoursBeforeCheckIn?: number;
  houseRulesMarkdown?: string;
  keyHandoffMessage?: string;
  requireStaffScanForKeys?: boolean;
  checkoutHoursBeforeDeparture?: number;
  allowInAppCheckoutPay?: boolean;
  allowFposAtDesk?: boolean;
  whatsappCheckInReminder?: boolean;
}

export function getCheckInOutConfig(settings: unknown): CheckInOutConfig {
  const s = (settings as { checkInOut?: CheckInOutConfig } | null)?.checkInOut ?? {};
  return {
    instantCheckInEnabled: s.instantCheckInEnabled ?? true,
    sendQrHoursBeforeCheckIn: s.sendQrHoursBeforeCheckIn ?? 24,
    houseRulesMarkdown: s.houseRulesMarkdown ?? '',
    keyHandoffMessage: s.keyHandoffMessage ?? 'Collect your room key(s) at the front desk.',
    requireStaffScanForKeys: s.requireStaffScanForKeys ?? true,
    checkoutHoursBeforeDeparture: s.checkoutHoursBeforeDeparture ?? 4,
    allowInAppCheckoutPay: s.allowInAppCheckoutPay ?? true,
    allowFposAtDesk: s.allowFposAtDesk ?? true,
    whatsappCheckInReminder: s.whatsappCheckInReminder ?? true,
  };
}

export function checkInQrPayload(subdomain: string, checkInCode: string): string {
  return tenantUrl(subdomain, `/checkin/${checkInCode}`);
}

export function checkoutQrPayload(subdomain: string, checkoutCode: string): string {
  return tenantUrl(subdomain, `/checkout/${checkoutCode}`);
}

/** Extract CI-/CO- code or confirmation from a raw scan (URL or plain text). */
export function normalizeCheckInScanCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const pathMatch = trimmed.match(/\/(checkin|checkout)\/([^/?#]+)/i);
  if (pathMatch?.[2]) return pathMatch[2].toUpperCase();

  const codeMatch = trimmed.match(/\b(CI|CO)-[A-Z0-9]+\b/i);
  if (codeMatch) return codeMatch[0].toUpperCase();

  return trimmed.toUpperCase();
}
