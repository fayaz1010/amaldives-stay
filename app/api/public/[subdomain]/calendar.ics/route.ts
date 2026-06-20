import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function toISODate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545: fold lines longer than 75 octets
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const chunk = bytes.slice(i, i + (i === 0 ? 75 : 74));
    parts.push((i === 0 ? '' : ' ') + chunk.toString('utf8'));
    i += chunk.length;
  }
  return parts.join('\r\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    if (!subdomain) {
      return new NextResponse('Subdomain required', { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain, status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return new NextResponse('Guesthouse not found', { status: 404 });
    }

    // Optional per-room feed: /calendar.ics?roomId=<id> exports only that room's
    // bookings. Required for multi-room OTA listings (one feed per listing) so a
    // booking in one room doesn't block every listing. No roomId = whole property.
    const roomId = request.nextUrl.searchParams.get('roomId');
    let roomLabel = '';
    if (roomId) {
      const room = await prisma.room.findFirst({
        where: { id: roomId, tenantId: tenant.id },
        select: { number: true, name: true },
      });
      if (!room) {
        return new NextResponse('Room not found', { status: 404 });
      }
      roomLabel = ` – ${room.name} ${room.number}`;
    }

    // Fetch all confirmed/checked-in bookings
    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        ...(roomId ? { roomId } : {}),
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        checkOutDate: { gte: new Date() }, // only future/ongoing
      },
      select: {
        id: true,
        confirmationNumber: true,
        checkInDate: true,
        checkOutDate: true,
        updatedAt: true,
      },
    });

    const now = toISODate(new Date());
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//amaldives STAY//stay.amaldives.com//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcal(tenant.name + roomLabel)} – Blocked Dates`,
      'X-WR-CALDESC:Availability calendar for channel manager sync',
      'X-WR-TIMEZONE:UTC',
    ];

    for (const b of bookings) {
      const checkIn = new Date(b.checkInDate);
      const checkOut = new Date(b.checkOutDate);
      // All-day events: use DATE format (YYYYMMDD)
      const dtStart = checkIn.toISOString().slice(0, 10).replace(/-/g, '');
      const dtEnd = checkOut.toISOString().slice(0, 10).replace(/-/g, '');
      const dtstamp = toISODate(b.updatedAt);

      lines.push('BEGIN:VEVENT');
      lines.push(foldLine(`UID:${b.id}@stay.amaldives.com`));
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(foldLine(`SUMMARY:BLOCKED – ${b.confirmationNumber ?? b.id.slice(-6)}`));
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const ical = lines.join('\r\n') + '\r\n';

    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${subdomain}-calendar.ics"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('iCal export error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
