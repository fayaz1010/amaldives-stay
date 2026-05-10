'use client';

import { useState } from 'react';
import { ArrivalsBoard } from '@/components/admin/arrivals-board';
import { DeparturesBoard } from '@/components/admin/departures-board';
import { Plane, LogOut } from 'lucide-react';

interface ArrivalsBoardProps {
  arrivals: any[];
  departures: any[];
  staff: any[];
}

export function ArrivalsPageClient({ arrivals, departures, staff }: ArrivalsBoardProps) {
  const [tab, setTab] = useState<'arrivals' | 'departures'>('arrivals');

  const todayArrivals = arrivals.filter((a) => {
    const d = a.scheduledArrival ?? a.booking.checkInDate;
    if (!d) return false;
    return new Date(d).toDateString() === new Date().toDateString();
  });

  const todayDepartures = departures.filter((b) => {
    return new Date(b.checkOutDate).toDateString() === new Date().toDateString();
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
        <ArrivalsBoard arrivals={arrivals} staff={staff} />
      ) : (
        <div className="p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Departures</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {todayDepartures.length} departing today · {departures.length} total upcoming
            </p>
          </div>
          <DeparturesBoard bookings={departures} />
        </div>
      )}
    </div>
  );
}
