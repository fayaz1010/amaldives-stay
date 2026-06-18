import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureCheckInCodes, checkInQrPayload, checkoutQrPayload } from '@/lib/instant-checkin';
import { getCheckInOutConfig } from '@/lib/checkin-out-config';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const booking = await prisma.booking.findUnique({
    where: { guestToken: params.token },
    include: {
      room: { select: { number: true, name: true, type: true } },
      property: { select: { name: true, policies: true } },
      tenant: { select: { subdomain: true, settings: true, name: true } },
    },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const codes = await ensureCheckInCodes(booking.id);
  const config = getCheckInOutConfig(booking.tenant.settings);
  const policies = (booking.property?.policies as Record<string, unknown>) ?? {};

  return NextResponse.json({
    checkInCode: codes.checkInCode,
    checkoutCode: codes.checkoutCode,
    checkInQrUrl: codes.checkInCode
      ? checkInQrPayload(booking.tenant.subdomain, codes.checkInCode)
      : null,
    checkoutQrUrl: codes.checkoutCode
      ? checkoutQrPayload(booking.tenant.subdomain, codes.checkoutCode)
      : null,
    status: booking.status,
    keysIssued: booking.keysIssued,
    checkedInAt: booking.checkedInAt,
    checkoutReadyAt: booking.checkoutReadyAt,
    room: booking.room,
    propertyName: booking.property?.name ?? booking.tenant.name,
    houseRules:
      config.houseRulesMarkdown ||
      (policies.houseRules as string) ||
      '',
    keyHandoffMessage: config.keyHandoffMessage,
    allowInAppCheckoutPay: config.allowInAppCheckoutPay,
    config,
  });
}
