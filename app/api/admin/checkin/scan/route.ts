import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCheckInOutConfig, normalizeCheckInScanCode } from '@/lib/checkin-out-config';
import { queueNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];

/**
 * Staff scans guest QR or types check-in code / confirmation number.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code, issueKeys } = await request.json();
  const raw = normalizeCheckInScanCode(String(code ?? ''));
  if (!raw) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      tenantId: session.user.tenantId,
      OR: [
        { checkInCode: raw },
        { checkoutCode: raw },
        { confirmationNumber: raw },
        { confirmationNumber: { equals: raw, mode: 'insensitive' } },
      ],
    },
    include: {
      guest: { select: { name: true, email: true } },
      room: { select: { number: true, name: true, type: true } },
      property: { select: { name: true, policies: true } },
      tenant: { select: { settings: true, subdomain: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const config = getCheckInOutConfig(booking.tenant.settings);
  const isCheckoutScan = booking.checkoutCode === raw || raw.startsWith('CO-');

  if (isCheckoutScan) {
    return NextResponse.json({
      mode: 'checkout',
      booking: {
        id: booking.id,
        confirmationNumber: booking.confirmationNumber,
        status: booking.status,
        checkoutReadyAt: booking.checkoutReadyAt,
        guest: booking.guest,
        room: booking.room,
      },
      message: 'Present guest bill at desk — use FPOS or record payment.',
      allowFpos: config.allowFposAtDesk,
    });
  }

  const now = new Date();
  const updates: Record<string, unknown> = {};
  if (booking.status === 'CONFIRMED' || booking.status === 'PENDING') {
    updates.status = 'CHECKED_IN';
    updates.checkedInAt = now;
  }
  if (issueKeys || !config.requireStaffScanForKeys) {
    updates.keysIssued = true;
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: updates,
    include: {
      guest: { select: { name: true, email: true } },
      room: { select: { number: true, name: true } },
    },
  });

  if (booking.guest.email) {
    await queueNotification({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      type: 'CHECKIN_WELCOME',
      to: booking.guest.email,
      subject: `Welcome — Room ${booking.room?.number}`,
      body: `<p>You're checked in. ${config.keyHandoffMessage}</p>`,
    }).catch(() => {});
  }

  const policies = (booking.property?.policies as Record<string, unknown>) ?? {};
  const houseRules =
    config.houseRulesMarkdown ||
    (policies.houseRules as string) ||
    (policies.checkInPolicy as string) ||
    '';

  return NextResponse.json({
    mode: 'checkin',
    booking: updated,
    houseRules,
    keyHandoffMessage: config.keyHandoffMessage,
    keysIssued: updated.keysIssued,
  });
}
