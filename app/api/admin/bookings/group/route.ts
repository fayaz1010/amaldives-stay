import { NextRequest, NextResponse } from 'next/server';
import { vayvesFrom, VAYVES_REPLY_TO } from '@/lib/email-from';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateStayRate } from '@/lib/calculate-stay-rate';
import { calculatePlatformFee, getPlatformCommissionRate } from '@/lib/commission';

export const dynamic = 'force-dynamic';

function generateConfirmationNumber() {
  return 'STAY-' + Date.now().toString(36).toUpperCase();
}

function calcNights(checkIn: Date, checkOut: Date) {
  return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 });

    const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const data = await request.json();
    const {
      roomIds,
      propertyId,
      checkInDate,
      checkOutDate,
      adults = 2,
      children = 0,
      guestData,
      guestId: providedGuestId,
      notes,
      specialRequests,
    } = data || {};

    // Validate required fields
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: 'roomIds array is required' }, { status: 400 });
    }
    if (!propertyId || !checkInDate || !checkOutDate) {
      return NextResponse.json({ error: 'propertyId, checkInDate, checkOutDate are required' }, { status: 400 });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (checkOut <= checkIn) {
      return NextResponse.json({ error: 'checkOutDate must be after checkInDate' }, { status: 400 });
    }

    // Validate property belongs to tenant
    let resolvedPropertyId = propertyId;
    if (!resolvedPropertyId || resolvedPropertyId === '_auto_') {
      // Look up property from the first room
      const firstRoom = await prisma.room.findFirst({
        where: { id: roomIds[0], tenantId },
        select: { propertyId: true },
      });
      if (!firstRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      resolvedPropertyId = firstRoom.propertyId;
    } else {
      const property = await prisma.property.findFirst({
        where: { id: resolvedPropertyId, tenantId },
        select: { id: true },
      });
      if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Validate all rooms belong to tenant and fetch basePrice + number
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds }, tenantId },
      select: { id: true, number: true, basePrice: true, rackRate: true, tenantId: true, propertyId: true },
    });
    if (rooms.length !== roomIds.length) {
      return NextResponse.json({ error: 'One or more rooms not found for this tenant' }, { status: 404 });
    }

    // Check none of the rooms are already booked for these dates
    const conflicts = await prisma.booking.findMany({
      where: {
        tenantId,
        roomId: { in: roomIds },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lt: checkOut } },
          { checkOutDate: { gt: checkIn } },
        ],
      },
      select: { roomId: true, room: { select: { number: true } } },
    });
    if (conflicts.length > 0) {
      const conflictNums = conflicts.map((c) => `Rm ${c.room?.number ?? c.roomId}`).join(', ');
      return NextResponse.json(
        { error: `Date conflict for: ${conflictNums}` },
        { status: 409 }
      );
    }

    // Resolve or create guest
    let guestId = providedGuestId as string | undefined;
    if (!guestId) {
      if (!guestData?.email || !guestData?.name) {
        return NextResponse.json(
          { error: 'guestData with name and email is required when guestId is not provided' },
          { status: 400 }
        );
      }
      const email = String(guestData.email).trim().toLowerCase();
      const name = String(guestData.name).trim();
      const guest = await prisma.user.upsert({
        where: { email },
        update: { name, tenantId },
        create: { email, name, role: 'GUEST', tenantId },
      });
      guestId = guest.id;

      const firstName = (guestData.firstName && String(guestData.firstName).trim()) || name.split(' ')[0] || name;
      const lastName = (guestData.lastName && String(guestData.lastName).trim()) || name.split(' ').slice(1).join(' ') || '';
      await prisma.guestProfile.upsert({
        where: { userId: guest.id },
        update: {
          firstName, lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality ? String(guestData.nationality) : undefined,
        },
        create: {
          userId: guest.id,
          firstName, lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality ? String(guestData.nationality) : undefined,
        },
      });
    }

    const nights = calcNights(checkIn, checkOut);
    const guestLabel = guestData?.name ?? 'Guest';
    const checkInLabel = checkIn.toLocaleDateString();

    const tenantForCommission = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { commissionRate: true, status: true, amaldivesSlug: true },
    });
    const commissionRate = getPlatformCommissionRate(tenantForCommission, 'DIRECT');

    // Create GroupBooking + all individual Bookings atomically
    const groupBooking = await prisma.$transaction(async (tx) => {
      const group = await tx.groupBooking.create({
        data: { tenantId, notes: notes ?? null },
      });

      for (const room of rooms) {
        const confirmationNumber = generateConfirmationNumber();
        const rate = await calculateStayRate({
          room,
          checkIn,
          checkOut,
        });
        const totalAmount = rate.totalAmount;
        const platformFee = calculatePlatformFee(totalAmount, commissionRate);
        await tx.booking.create({
          data: {
            tenantId,
            propertyId: resolvedPropertyId,
            roomId: room.id,
            guestId: guestId!,
            groupBookingId: group.id,
            confirmationNumber,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults,
            children,
            totalAmount,
            platformFee,
            status: 'CONFIRMED',
            source: 'DIRECT',
            specialRequests: specialRequests ?? null,
            notes: notes ?? null,
          },
        });
      }

      return group;
    });

    // Fetch created bookings for task creation and response
    const createdBookings = await prisma.booking.findMany({
      where: { groupBookingId: groupBooking.id },
      select: { id: true, roomId: true, confirmationNumber: true },
    });

    const { ensureCheckInCodes } = await import('@/lib/instant-checkin');
    for (const b of createdBookings) {
      await ensureCheckInCodes(b.id);
    }

    // Auto-create arrival tasks per room — fire and forget
    try {
      const taskData: any[] = [];
      for (const booking of createdBookings) {
        const room = rooms.find((r) => r.id === booking.roomId);
        const roomLabel = room?.number ? ` Rm ${room.number}` : '';
        taskData.push(
          {
            tenantId, bookingId: booking.id, source: 'BOOKING', category: 'TRANSFER',
            title: `Arrange transfer — ${guestLabel}${roomLabel} (${checkInLabel})`,
            description: 'Book and confirm transport from airport to property.',
            priority: 'HIGH', status: 'PENDING', dueDate: checkIn,
          },
          {
            tenantId, bookingId: booking.id, source: 'BOOKING', category: 'AIRPORT_PICKUP',
            title: `Airport pickup — ${guestLabel}${roomLabel} (${checkInLabel})`,
            description: 'Confirm who is picking up the guest at the airport.',
            priority: 'HIGH', status: 'PENDING', dueDate: checkIn,
          },
          {
            tenantId, bookingId: booking.id, source: 'BOOKING', category: 'ARRIVAL_WELCOME',
            title: `Arrival welcome — ${guestLabel}${roomLabel} (${checkInLabel})`,
            description: 'Prepare welcome drinks, room key, and check-in materials.',
            priority: 'MEDIUM', status: 'PENDING', dueDate: checkIn,
          },
        );
      }
      await prisma.staffTask.createMany({ data: taskData });
    } catch (taskErr) {
      console.error('Auto-task creation failed (group booking still created):', taskErr);
    }

    // Fire-and-forget consolidated confirmation email for the whole group
    (async () => {
      try {
        const [guestRec, propRec, roomDetails] = await Promise.all([
          prisma.user.findUnique({ where: { id: guestId! }, include: { guestProfile: true } }),
          prisma.property.findUnique({ where: { id: resolvedPropertyId }, select: { name: true, phone: true, email: true } }),
          prisma.room.findMany({
            where: { id: { in: roomIds } },
            select: { id: true, number: true, name: true, type: true },
          }),
        ]);

        if (!guestRec?.email) return;

        const totalAmount = createdBookings.reduce((sum, b) => {
          const room = rooms.find((r) => r.id === b.roomId);
          return sum + (room ? room.basePrice * nights : 0);
        }, 0);

        const checkInLong = checkIn.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const checkOutLong = checkOut.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const propertyName = propRec?.name ?? 'Property';
        const displayName = guestRec.guestProfile?.firstName ?? guestRec.name ?? 'Guest';

        const roomsListHtml = createdBookings
          .map((b) => {
            const room = roomDetails.find((r) => r.id === b.roomId);
            const label = room?.name ?? String(room?.type ?? 'Room');
            const num = room?.number ? ` (Room ${room.number})` : '';
            return `<tr>
              <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;">${label}${num}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;text-align:right;">${b.confirmationNumber}</td>
            </tr>`;
          })
          .join('');

        const contactRows: string[] = [];
        if (propRec?.phone) {
          contactRows.push(`<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;">Phone</td><td style="padding:6px 0;color:#111827;font-size:14px;text-align:right;">${propRec.phone}</td></tr>`);
        }
        if (propRec?.email) {
          contactRows.push(`<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;">Email</td><td style="padding:6px 0;color:#111827;font-size:14px;text-align:right;"><a href="mailto:${propRec.email}" style="color:#0F766E;text-decoration:none;">${propRec.email}</a></td></tr>`);
        }

        const totalFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(totalAmount);

        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Booking Confirmed</title></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9FAFB;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr><td style="background:#14B8A6;padding:28px 32px;"><div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Vayves</div></td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">Booking Confirmed!</h1>
          <p style="margin:0 0 8px;font-size:16px;color:#111827;">Dear ${displayName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.5;">Thank you for booking with <strong style="color:#111827;">${propertyName}</strong>. Your group reservation of <strong>${rooms.length} room${rooms.length === 1 ? '' : 's'}</strong> is confirmed.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:6px;margin-bottom:20px;">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;">Check-in</td><td style="padding:14px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;text-align:right;">${checkInLong}</td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;">Check-out</td><td style="padding:14px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;text-align:right;">${checkOutLong}</td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;">Nights</td><td style="padding:14px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;text-align:right;">${nights}</td></tr>
            <tr><td style="padding:14px 16px;color:#6B7280;font-size:13px;">Total Amount</td><td style="padding:14px 16px;color:#0F766E;font-size:16px;font-weight:700;text-align:right;">${totalFormatted}</td></tr>
          </table>

          <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">Rooms (${rooms.length})</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:6px;margin-bottom:24px;">
            ${roomsListHtml}
          </table>

          ${contactRows.length ? `<h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">Property Contact</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">${contactRows.join('')}</table>` : ''}

          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">We look forward to welcoming your group. Reply to this email with any questions or special requests.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;"><div style="font-size:12px;color:#6B7280;">Powered by <strong style="color:#0F766E;">Vayves</strong></div></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

        const { resend } = await import('@/lib/email');
        await resend.emails.send({
          from: vayvesFrom(),
          replyTo: VAYVES_REPLY_TO,
          to: guestRec.email,
          subject: `Booking Confirmed - ${rooms.length} room${rooms.length === 1 ? '' : 's'} at ${propertyName}`,
          html,
        });
      } catch (e) {
        console.error('Group email send failed:', e);
      }
    })();

    return NextResponse.json(
      {
        groupBookingId: groupBooking.id,
        roomCount: rooms.length,
        nights,
        bookings: createdBookings,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Group booking API error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
