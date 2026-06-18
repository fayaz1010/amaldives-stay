/**
 * Match ArrivalRecord.transportRef against the live/demo Malé arrivals board
 * and copy the latest ETA back onto the record so transfer planning reflects
 * actual flight movement. Skips records already CHECKED_IN since their eta is
 * historical at that point.
 */

import { prisma } from '@/lib/db';
import { getMaleArrivals, type FlightArrival } from '@/lib/flights';

export function normalizeFlightRef(ref: string | null | undefined): string {
  if (!ref) return '';
  return ref.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function matchArrivalToFlight(
  transportRef: string | null | undefined,
  arrivals: FlightArrival[],
): FlightArrival | null {
  const norm = normalizeFlightRef(transportRef);
  if (!norm) return null;
  for (const f of arrivals) {
    if (normalizeFlightRef(f.flight) === norm) return f;
  }
  return null;
}

export interface FlightSyncResult {
  source: 'live' | 'demo';
  scanned: number;
  matched: number;
  updated: number;
  unchanged: number;
  unmatched: number;
}

export async function syncArrivalEtasFromFlightBoard(): Promise<FlightSyncResult> {
  const board = await getMaleArrivals();
  const records = await prisma.arrivalRecord.findMany({
    where: {
      transportRef: { not: null },
      status: { not: 'CHECKED_IN' },
    },
    select: { id: true, transportRef: true, eta: true },
  });

  let matched = 0;
  let updated = 0;
  let unchanged = 0;
  let unmatched = 0;

  for (const record of records) {
    const flight = matchArrivalToFlight(record.transportRef, board.arrivals);
    if (!flight) {
      unmatched++;
      continue;
    }
    matched++;

    const etaIso = flight.estimated || flight.scheduled;
    if (!etaIso) {
      unchanged++;
      continue;
    }
    const nextEta = new Date(etaIso);
    if (Number.isNaN(nextEta.getTime())) {
      unchanged++;
      continue;
    }
    if (record.eta && record.eta.getTime() === nextEta.getTime()) {
      unchanged++;
      continue;
    }

    await prisma.arrivalRecord.update({
      where: { id: record.id },
      data: { eta: nextEta },
    });
    updated++;
  }

  return {
    source: board.source,
    scanned: records.length,
    matched,
    updated,
    unchanged,
    unmatched,
  };
}
