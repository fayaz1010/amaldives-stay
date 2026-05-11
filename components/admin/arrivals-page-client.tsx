'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrivalsBoard } from '@/components/admin/arrivals-board';
import { DeparturesBoard } from '@/components/admin/departures-board';
import { Plane, LogOut } from 'lucide-react';

interface Props {
  arrivals: any[];
  departureRecords: any[];
  staff: any[];
  defaultPlans?: {
    arrivalTransportType?: string | null;
    departureTransportType?: string | null;
    arrivalJettyTransport?: string | null;
    departureJettyTransport?: string | null;
  };
  unplannedArrivalsByDate?: Record<string, number>;
  unplannedDeparturesByDate?: Record<string, number>;
}

export function ArrivalsPageClient({ arrivals, departureRecords, staff, defaultPlans = {}, unplannedArrivalsByDate = {}, unplannedDeparturesByDate = {} }: Props) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'departures' ? 'departures' : 'arrivals';
  const [tab, setTab] = useState<'arrivals' | 'departures'>(initialTab);

  const todayStr = new Date().toDateString();

  const todayArrivals = arrivals.filter((a) => {
    const d = a.scheduledArrival ?? a.booking.checkInDate;
    return d ? new Date(d).toDateString() === todayStr : false;
  });

  const todayDepartures = departureRecords.filter((r) => {
    const d = r.scheduledDeparture ?? r.booking.checkOutDate;
    return d ? new Date(d).toDateString() === todayStr : false;
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b bg-white px-6 pt-4">
        <button
          onClick={() => setTab('arrivals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'arrivals'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plane className="h-4 w-4" />
          Arrivals
          {todayArrivals.length > 0 && (
            <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {todayArrivals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('departures')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'departures'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <LogOut className="h-4 w-4" />
          Departures
          {todayDepartures.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {todayDepartures.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'arrivals' ? (
        <ArrivalsBoard arrivals={arrivals} staff={staff} defaultTransportType={defaultPlans.arrivalTransportType ?? undefined} defaultJettyTransport={defaultPlans.arrivalJettyTransport ?? undefined} unplannedByDate={unplannedArrivalsByDate} />
      ) : (
        <DeparturesBoard records={departureRecords} defaultTransportType={defaultPlans.departureTransportType ?? undefined} defaultJettyTransport={defaultPlans.departureJettyTransport ?? undefined} unplannedByDate={unplannedDeparturesByDate} />
      )}
    </div>
  );
}
