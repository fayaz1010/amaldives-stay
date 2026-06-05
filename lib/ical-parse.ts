// Minimal RFC 5545 iCalendar parser.
//
// Booking.com and Airbnb both emit a flat VCALENDAR with one VEVENT per
// booking — no recurrence, no timezones, just DTSTART/DTEND/UID/SUMMARY.
// Pulling in a 100KB dependency for that would be silly, so we have a
// purpose-built parser that handles:
//   - Line unfolding (RFC 5545 §3.1 — lines starting with whitespace are
//     continuations of the previous line)
//   - VEVENT block extraction (we ignore VTIMEZONE / VALARM blocks)
//   - DATE values (YYYYMMDD), DATE-TIME UTC (YYYYMMDDTHHMMSSZ), and
//     local-floating DATE-TIMEs (treated as UTC because that's how
//     Booking/Airbnb publish them)
//
// We don't support recurring events, attendees, or any extensions. If we
// ever connect to a non-OTA source that emits those, swap in `node-ical`
// instead.

export interface IcalEvent {
  uid: string;
  startDate: Date;
  endDate: Date;
  summary?: string;
  description?: string;
}

export function parseIcal(raw: string): IcalEvent[] {
  // §3.1: unfold continuation lines (any line that begins with space or tab
  // is appended to the previous line).
  const unfolded = raw
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '');

  const lines = unfolded.split('\n');
  const events: IcalEvent[] = [];

  let inEvent = false;
  let current: Partial<IcalEvent> & { uid?: string; startDate?: Date; endDate?: Date } | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.uid && current.startDate && current.endDate) {
        events.push({
          uid: current.uid,
          startDate: current.startDate,
          endDate: current.endDate,
          summary: current.summary,
          description: current.description,
        });
      }
      inEvent = false;
      current = null;
      continue;
    }
    if (!inEvent || !current) continue;

    // Lines look like `DTSTART;VALUE=DATE:20260612` or `UID:abcd@xyz`.
    // Split into name+params and value at the first unescaped colon.
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [propName] = left.split(';', 1);

    switch (propName) {
      case 'UID':
        current.uid = value;
        break;
      case 'SUMMARY':
        current.summary = unescapeIcalText(value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeIcalText(value);
        break;
      case 'DTSTART':
        current.startDate = parseIcalDate(value) ?? current.startDate;
        break;
      case 'DTEND':
        current.endDate = parseIcalDate(value) ?? current.endDate;
        break;
    }
  }

  return events;
}

function parseIcalDate(raw: string): Date | undefined {
  // YYYYMMDD (DATE) — interpret as UTC midnight, matching how OTAs publish.
  const dateOnly = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return new Date(Date.UTC(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]));
  }
  // YYYYMMDDTHHMMSSZ (DATE-TIME UTC)
  const utc = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (utc) {
    return new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6]));
  }
  // YYYYMMDDTHHMMSS (DATE-TIME floating) — treat as UTC.
  const floating = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (floating) {
    return new Date(Date.UTC(+floating[1], +floating[2] - 1, +floating[3], +floating[4], +floating[5], +floating[6]));
  }
  return undefined;
}

function unescapeIcalText(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}
