/**
 * Flight arrivals for Velana International Airport, Malé (IATA MLE / ICAO VRMM).
 *
 * Powers transfer planning: guesthouses with their own boats schedule pickups
 * around when guests' flights actually land. eZee (channel manager) has no such
 * feature — this is a differentiator.
 *
 * LIVE data: set AERODATABOX_API_KEY (free tier at rapidapi.com/aedbx-aedbx/api/aerodatabox).
 * Without a key we return a realistic DEMO board (clearly flagged) so the
 * feature is still demoable; it flips to live automatically once the key is set.
 */

export interface FlightArrival {
  flight: string;        // e.g. "QR676"
  airline: string;       // e.g. "Qatar Airways"
  from: string;          // origin airport/city
  scheduled: string;     // ISO time of scheduled landing
  estimated: string | null; // ISO estimated/actual landing if known
  status: string;        // e.g. "Scheduled" | "Expected" | "Landed"
}

export interface ArrivalsBoard {
  source: 'live' | 'demo';
  airport: string;
  generatedAt: string;
  arrivals: FlightArrival[];
  note?: string;
}

const VRMM = 'VRMM';
const AIRPORT = 'Velana International (MLE), Malé';

// ── Live provider: AeroDataBox FIDS via RapidAPI ─────────────────────────────
async function fetchLive(): Promise<FlightArrival[] | null> {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) return null;
  const now = new Date();
  const end = new Date(now.getTime() + 6 * 3600 * 1000); // next 6h window
  const fmt = (d: Date) => d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  const url =
    `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${VRMM}/${fmt(now)}/${fmt(end)}` +
    `?direction=Arrival&withLeg=true&withCancelled=false&withCodeshared=false&withLocation=false`;
  try {
    const res = await fetch(url, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' },
      // edge-cache for a minute so we don't burn the free quota on every load
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const arr = (data?.arrivals ?? []) as any[];
    return arr.map((a) => {
      const t = a.movement ?? {};
      return {
        flight: (a.number || '').replace(/\s+/g, ''),
        airline: a.airline?.name ?? 'Airline',
        from: t.airport?.name || t.airport?.municipalityName || '—',
        scheduled: t.scheduledTime?.utc || t.scheduledTimeUtc || '',
        estimated: t.revisedTime?.utc || t.predictedTime?.utc || null,
        status: a.status || 'Scheduled',
      } as FlightArrival;
    }).filter((f) => f.flight && f.scheduled);
  } catch {
    return null;
  }
}

// ── Demo provider: realistic Malé arrivals, timed relative to "now" ──────────
function demoBoard(): FlightArrival[] {
  const now = Date.now();
  const at = (mins: number) => new Date(now + mins * 60_000).toISOString();
  // Common real long-haul/regional routes into MLE; times spread across the afternoon.
  const rows: Array<[string, string, string, number, string]> = [
    ['EK652', 'Emirates',            'Dubai (DXB)',        25,  'Expected'],
    ['QR676', 'Qatar Airways',       'Doha (DOH)',         55,  'Scheduled'],
    ['6E1423', 'IndiGo',             'Bengaluru (BLR)',    80,  'Scheduled'],
    ['UL103', 'SriLankan Airlines',  'Colombo (CMB)',      110, 'Scheduled'],
    ['EY278', 'Etihad Airways',      'Abu Dhabi (AUH)',    140, 'Scheduled'],
    ['SQ452', 'Singapore Airlines',  'Singapore (SIN)',    175, 'Scheduled'],
    ['TK730', 'Turkish Airlines',    'Istanbul (IST)',     210, 'Scheduled'],
  ];
  return rows.map(([flight, airline, from, mins, status]) => ({
    flight, airline, from,
    scheduled: at(mins),
    estimated: status === 'Expected' ? at(mins + 8) : null,
    status,
  }));
}

export async function getMaleArrivals(): Promise<ArrivalsBoard> {
  const live = await fetchLive();
  if (live && live.length) {
    return { source: 'live', airport: AIRPORT, generatedAt: new Date().toISOString(), arrivals: live };
  }
  return {
    source: 'demo',
    airport: AIRPORT,
    generatedAt: new Date().toISOString(),
    arrivals: demoBoard(),
    note: 'Sample data — set AERODATABOX_API_KEY (free) to show live Velana arrivals.',
  };
}
