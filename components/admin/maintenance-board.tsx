'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Wrench } from 'lucide-react';
import { AddMaintenanceModal } from './add-maintenance-modal';

const statusColors: Record<string, string> = {
  REPORTED: 'bg-red-100 text-red-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string | Date;
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

export function MaintenanceBoard({ requests, rooms }: MaintenanceBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">{requests.length} total request(s)</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Wrench className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium mb-2">No maintenance requests</p>
            <p className="text-sm">Report issues with rooms or facilities to track them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{r.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          statusColors[r.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          priorityColors[r.priority] || priorityColors.MEDIUM
                        }`}
                      >
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{r.description}</p>
                    <p className="text-xs text-gray-400">
                      {r.room?.number ? `Room ${r.room.number} · ` : ''}
                      Reported by {r.reporter?.name || 'Unknown'} ·{' '}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {(r.status === 'REPORTED' || r.status === 'ASSIGNED') && (
                      <Button
                        size="sm"
                        variant="outline"
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
                        className="bg-green-600 hover:bg-green-700"
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMaintenanceModal
        open={addOpen}
        onOpenChange={setAddOpen}
        rooms={rooms}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
