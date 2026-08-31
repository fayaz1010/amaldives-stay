import { NextRequest, NextResponse } from 'next/server';
import { vayvesFrom, VAYVES_REPLY_TO } from '@/lib/email-from';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { TenantDb, prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';
import { generateConfirmationNumber } from '@/lib/booking-ref';

export const dynamic = 'force-dynamic';

const isoDate = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date');

const GuestDataSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  nationality: z.string().trim().max(80).optional(),
});

const AdminBookingSchema = z
  .object({
    roomId: z.string().min(1),
    propertyId: z.string().min(1),
    checkInDate: isoDate,
    checkOutDate: isoDate,
    adults: z.number().int().positive().max(20),
    children: z.number().int().nonnegative().max(20).optional().default(0),
    totalAmount: z.number().nonnegative().optional(),
    status: z.string().max(40).optional().default('CONFIRMED'),
    source: z.string().max(60).optional().default('DIRECT'),
    guestData: GuestDataSchema.optional(),
    guestId: z.string().min(1).optional(),
    specialRequests: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    confirmationNumber: z.string().max(60).optional(),
  })
  .refine((v) => new Date(v.checkOutDate) > new Date(v.checkInDate), {
    message: 'checkOutDate must be after checkInDate',
    path: ['checkOutDate'],
  })
  .refine((v) => Boolean(v.guestId || v.guestData), {
    message: 'guestData (name + email) is required when guestId is not provided',
    path: ['guestData'],
  });

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit');

    const tenantDb = new TenantDb(session.user.tenantId);
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (limit) {
      filters.limit = parseInt(limit);
    }

    // Scope to the active property for multi-property operators.
    const activePropertyId = await getActivePropertyId(session.user.tenantId);
    if (activePropertyId) {
      filters.propertyId = activePropertyId;
    }

    const bookings = await tenantDb.getBookings(filters);

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calcNights(checkIn: Date, checkOut: Date) {
  return Math.max(
    1,
    Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const rawBody = await request.json().catch(() => null);
    const parsed = AdminBookingSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      roomId,
      propertyId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      totalAmount,
      status,
      source,
      guestData,
      guestId: providedGuestId,
      specialRequests,
      notes,
      confirmationNumber: providedConfirmation,
    } = parsed.data;

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const room = await prisma.room.findFirst({
      where: { id: roomId, tenantId },
      select: { id: true, basePrice: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found for this tenant' }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found for this tenant' }, { status: 404 });
    }

    const nights = calcNights(checkIn, checkOut);
    const computedTotal =
      typeof totalAmount === 'number' && totalAmount >= 0
        ? totalAmount
        : room.basePrice * nights;

    let guestId = providedGuestId as string | undefined;

    if (!guestId) {
      if (!guestData || !guestData.email || !guestData.name) {
        return NextResponse.json(
          { error: 'guestData with name and email is required when guestId is not provided' },
          { status: 400 }
        );
      }

      const email = String(guestData.email).trim().toLowerCase();
      const name = String(guestData.name).trim();

      const guest = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          tenantId,
        },
        create: {
          email,
          name,
          role: 'GUEST',
          tenantId,
        },
      });
      guestId = guest.id;

      const firstName =
        (guestData.firstName && String(guestData.firstName).trim()) ||
        name.split(' ')[0] ||
        name;
      const lastName =
        (guestData.lastName && String(guestData.lastName).trim()) ||
        name.split(' ').slice(1).join(' ') ||
        '';

      await prisma.guestProfile.upsert({
        where: { userId: guest.id },
        update: {
          firstName,
          lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality
            ? String(guestData.nationality)
            : undefined,
        },
        create: {
          userId: guest.id,
          firstName,
          lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality
            ? String(guestData.nationality)
            : undefined,
        },
      });
    }

    const tenantDb = new TenantDb(tenantId);
    const confirmationNumber = providedConfirmation || generateConfirmationNumber();

    const booking = await tenantDb.createBooking({
      roomId,
      propertyId,
      guestId,
      confirmationNumber,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      children,
      totalAmount: computedTotal,
      status,
      source,
      specialRequests,
      notes,
    });

    // Email the guest their confirmation number + portal link. Public/self-serve
    // and Stripe-paid bookings email from their own routes; this covers
    // operator-created bookings. Done HERE (server-only route) rather than in
    // lib/db (which is client-reachable and would pull email into the client bundle).
    try {
      const guestEmail = (booking as any).guest?.email as string | undefined;
      const guestToken = (booking as any).guestToken as string | undefined;
      if (guestEmail && guestToken) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { subdomain: true, name: true },
        });
        if (tenant?.subdomain) {
          const { queueNotification } = await import('@/lib/notifications');
          const { tenantUrl } = await import('@/lib/domain');
          const guestUrl = tenantUrl(tenant.subdomain, `/guest/${guestToken}`);
          const fmt = (d: Date) => new Date(d).toLocaleDateString();
          await queueNotification({
            tenantId,
            bookingId: booking.id,
            type: 'BOOKING_CONFIRMATION',
            to: guestEmail,
            subject: `Booking confirmed — ${confirmationNumber}`,
            body:
              `<p>Your booking at ${tenant.name ?? 'our property'} is confirmed.</p>` +
              `<p>Confirmation number: <strong>${confirmationNumber}</strong></p>` +
              `<p>Check-in <strong>${fmt(checkIn)}</strong> → Check-out <strong>${fmt(checkOut)}</strong></p>` +
              `<p><a href="${guestUrl}">Open your guest portal</a> to view your bill, check in, and message the front desk.</p>`,
          });
        }
      }
    } catch {
      /* never block booking creation on the confirmation email */
    }

    // Auto-create arrival prep tasks — fire and forget, never block the booking response
    try {
      // Fetch guest name for task titles
      const guestRecord = await prisma.user.findUnique({
        where: { id: guestId },
        select: { name: true, guestProfile: { select: { firstName: true, lastName: true } } },
      });
      const profile = guestRecord?.guestProfile;
      const guestLabel = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : (guestRecord?.name ?? guestData?.name ?? 'Guest');
      const checkInLabel = checkIn.toLocaleDateString();
      // Get room number
      const roomRecord = await prisma.room.findUnique({
        where: { id: roomId },
        select: { number: true },
      });
      const roomLabel = roomRecord?.number ?? '';

      await prisma.staffTask.createMany({
        data: [
          {
            tenantId,
            bookingId: booking.id,
            source: 'BOOKING',
            category: 'TRANSFER',
            title: `Arrange transfer — ${guestLabel}${roomLabel ? ` Rm ${roomLabel}` : ''} (${checkInLabel})`,
            description: 'Book and confirm transport from airport to property for arriving guest.',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: checkIn,
          },
          {
            tenantId,
            bookingId: booking.id,
            source: 'BOOKING',
            category: 'AIRPORT_PICKUP',
            title: `Airport pickup — ${guestLabel}${roomLabel ? ` Rm ${roomLabel}` : ''} (${checkInLabel})`,
            description: 'Confirm who is picking up the guest at the airport and arrange logistics.',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: checkIn,
          },
          {
            tenantId,
            bookingId: booking.id,
            source: 'BOOKING',
            category: 'ARRIVAL_WELCOME',
            title: `Arrival welcome — ${guestLabel}${roomLabel ? ` Rm ${roomLabel}` : ''} (${checkInLabel})`,
            description: 'Prepare welcome drinks, room key, and check-in materials.',
            priority: 'MEDIUM',
            status: 'PENDING',
            dueDate: checkIn,
          },
        ],
      });
    } catch (taskErr) {
      console.error('Auto-task creation failed (booking still created):', taskErr);
    }

    // Fire-and-forget confirmation email
    (async () => {
      try {
        const [guestRec, roomRec, propRec] = await Promise.all([
          prisma.user.findUnique({ where: { id: guestId! }, include: { guestProfile: true } }),
          prisma.room.findUnique({ where: { id: roomId }, select: { number: true, name: true, type: true } }),
          prisma.property.findUnique({ where: { id: propertyId }, select: { name: true, phone: true, email: true } }),
        ]);
        if (guestRec?.email) {
          const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
          const { bookingConfirmationHtml } = await import('@/lib/email-templates');
          const { resend } = await import('@/lib/email');
          await resend.emails.send({
            from: vayvesFrom(),
            replyTo: VAYVES_REPLY_TO,
            to: guestRec.email,
            subject: `Booking Confirmed - ${confirmationNumber}`,
            html: bookingConfirmationHtml({
              guestName: guestRec.guestProfile?.firstName ?? guestRec.name ?? 'Guest',
              confirmationNumber,
              propertyName: propRec?.name ?? 'Property',
              checkIn: checkIn.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              checkOut: checkOut.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              roomName: roomRec?.name ?? String(roomRec?.type ?? 'Room'),
              roomNumber: roomRec?.number ?? '',
              nights,
              totalAmount: computedTotal,
              currency: 'USD',
              propertyPhone: propRec?.phone ?? '',
              propertyEmail: propRec?.email ?? '',
            }),
          });
        }
      } catch (e) {
        console.error('Email send failed:', e);
      }
    })();

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    console.error('Create booking API error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A booking with this confirmation number already exists. Try again.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
