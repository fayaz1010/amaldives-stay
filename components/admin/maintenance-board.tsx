'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Clock, CalendarCheck } from 'lucide-react';
import { AddMaintenanceModal } from './add-maintenance-modal';

type DateRange = 'today' | 'week' | 'month' | 'all';

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const categoryColors: Record<string, string> = {
  ELECTRICAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PLUMBING: 'bg-blue-50 text-blue-700 border-blue-200',
  HVAC: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  FURNITURE: 'bg-amber-50 text-amber-700 border-amber-200',
  APPLIANCE: 'bg-purple-50 text-purple-700 border-purple-200',
  STRUCTURAL: 'bg-red-50 text-red-700 border-red-200',
  GENERAL: 'bg-gray-50 text-gray-600 border-gray-200',
};

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  room?: { number: string } | null;
  reporter?: { name: string | null } | null;
}

interface Room {
  id: string;
  number: string;
}

interface MaintenanceBoardProps {
  requests: MaintenanceRequest[];
  rooms: Room[];
}

// Map DB statuses to Kanban columns
const COLUMNS = [
  {
    key: 'REPORTED',
    title: 'Reported',
    color: 'bg-red-50 border-red-200',
    statuses: ['REPORTED', 'ASSIGNED'],
  },
  {
    key: 'IN_PROGRESS',
    title: 'In Progress',
    color: 'bg-blue-50 border-blue-200',
    statuses: ['IN_PROGRESS'],
  },
  {
    key: 'COMPLETED',
    title: 'Resolved',
    color: 'bg-green-50 border-green-200',
    statuses: ['COMPLETED'],
  },
];

const DATE_FILTERS: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

function startOf(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

export function MaintenanceBoard({ requests, rooms }: MaintenanceBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const filteredRequests = useMemo(() => {
    const cutoff = startOf(dateRange);
    if (!cutoff) return requests;
    return requests.filter((r) => {
      const dateField =
        r.status === 'COMPLETED' && r.completedAt
          ? new Date(r.completedAt)
          : new Date(r.createdAt);
      return dateField >= cutoff;
    });
  }, [requests, dateRange]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update request');
    } finally {
      setBusyId(null);
    }
  }

  const totalResolved = requests.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalResolved} resolved · {requests.length} total requests on record
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-2 mb-5 p-2 bg-gray-50 rounded-lg border">
        <span className="text-xs text-gray-500 font-medium mr-1">Show:</span>
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateRange(f.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              dateRange === f.value
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colRequests = filteredRequests.filter((r) =>
            col.statuses.includes(r.status)
          );
          const totalForCol = requests.filter((r) => col.statuses.includes(r.status)).length;

          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-semibold text-gray-800">{col.title}</h2>
                <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border">
                  {colRequests.length}
                  {dateRange !== 'all' && totalForCol !== colRequests.length && (
                    <span className="text-gray-400"> / {totalForCol}</span>
                  )}
                </span>
              </div>

              <div className="space-y-2">
                {colRequests.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No requests</p>
                ) : (
                  colRequests.map((r) => (
                    <Card key={r.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm leading-tight">{r.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              priorityColors[r.priority] || priorityColors.MEDIUM
                            }`}
                          >
                            {r.priority}
                          </span>
                        </div>

                        {r.category && (
                          <span
                            className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded border ${
                              categoryColors[r.category] || categoryColors.GENERAL
                            }`}
                          >
                            {r.category}
                          </span>
                        )}

                        <p className="text-xs text-gray-600 line-clamp-2">{r.description}</p>

                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {r.room?.number ? `Room ${r.room.number} · ` : ''}
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {r.status === 'COMPLETED' && r.completedAt && (
                          <div className="flex items-center gap-1 text-[11px] text-green-600">
                            <CalendarCheck className="h-3 w-3 shrink-0" />
                            <span>
                              Resolved:{' '}
                              {new Date(r.completedAt).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        )}

                        {r.reporter?.name && (
                          <p className="text-[11px] text-gray-500">👤 {r.reporter.name}</p>
                        )}

                        <div className="pt-1">
                          {(r.status === 'REPORTED' || r.status === 'ASSIGNED') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs w-full"
                              disabled={busyId === r.id}
                              onClick={() => updateStatus(r.id, 'IN_PROGRESS')}
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Start Work'
                              )}
                            </Button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs w-full bg-green-600 hover:bg-green-700"
                              disabled={busyId === r.id}
                              onClick={() => updateStatus(r.id, 'COMPLETED')}
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Resolve'
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddMaintenanceModal
        open={addOpen}
        onOpenChange={setAddOpen}
        rooms={rooms}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
