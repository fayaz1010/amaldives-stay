'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Clock, CalendarCheck } from 'lucide-react';
import { AddTaskModal } from './add-task-modal';

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

type DateRange = 'today' | 'week' | 'month' | 'all';

interface Task {
  id: string;
  status: string;
  priority: string;
  taskType: string;
  scheduledDate: string | Date;
  completedAt?: string | Date | null;
  notes?: string | null;
  description?: string | null;
  room?: { number: string } | null;
  assignedUser?: { name: string | null } | null;
}

interface Room {
  id: string;
  number: string;
}

interface HousekeepingBoardProps {
  tasks: Task[];
  rooms: Room[];
}

const COLUMNS = [
  { key: 'PENDING', title: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { key: 'COMPLETED', title: 'Completed', color: 'bg-green-50 border-green-200' },
];

const DATE_FILTERS: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

function startOf(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

export function HousekeepingBoard({ tasks, rooms }: HousekeepingBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const filteredTasks = useMemo(() => {
    const cutoff = startOf(dateRange);
    if (!cutoff) return tasks;
    return tasks.filter((t) => {
      // For completed tasks, filter by completedAt; for others, filter by scheduledDate
      const dateField = t.status === 'COMPLETED' && t.completedAt
        ? new Date(t.completedAt)
        : new Date(t.scheduledDate);
      return dateField >= cutoff;
    });
  }, [tasks, dateRange]);

  async function updateStatus(taskId: string, status: string) {
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/admin/housekeeping/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update task');
    } finally {
      setBusyId(null);
    }
  }

  const totalCompleted = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCompleted} completed task{totalCompleted !== 1 ? 's' : ''} on record
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
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
          const colTasks = filteredTasks.filter((t) => t.status === col.key);
          const totalForCol = tasks.filter((t) => t.status === col.key).length;
          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-semibold text-gray-800">{col.title}</h2>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border">
                    {colTasks.length}
                    {dateRange !== 'all' && totalForCol !== colTasks.length && (
                      <span className="text-gray-400"> / {totalForCol}</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No tasks</p>
                ) : (
                  colTasks.map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            Room {task.room?.number ?? '—'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              priorityColors[task.priority] || priorityColors.MEDIUM
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 capitalize">
                          {task.taskType?.replace(/_/g, ' ').toLowerCase()}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            Scheduled:{' '}
                            {task.scheduledDate
                              ? new Date(task.scheduledDate).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                        {task.status === 'COMPLETED' && task.completedAt && (
                          <div className="flex items-center gap-1 text-[11px] text-green-600">
                            <CalendarCheck className="h-3 w-3 shrink-0" />
                            <span>
                              Done:{' '}
                              {new Date(task.completedAt).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        )}
                        {task.notes && (
                          <p className="text-[11px] text-gray-500 bg-gray-50 rounded px-2 py-1 line-clamp-2">
                            {task.notes}
                          </p>
                        )}
                        {task.assignedUser?.name && (
                          <p className="text-[11px] text-gray-500">
                            👤 {task.assignedUser.name}
                          </p>
                        )}
                        <div className="flex gap-2 pt-1">
                          {task.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs flex-1"
                              disabled={busyId === task.id}
                              onClick={() => updateStatus(task.id, 'IN_PROGRESS')}
                            >
                              {busyId === task.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Start Task'
                              )}
                            </Button>
                          )}
                          {task.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700"
                              disabled={busyId === task.id}
                              onClick={() => updateStatus(task.id, 'COMPLETED')}
                            >
                              {busyId === task.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Mark Done'
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

      <AddTaskModal
        open={addOpen}
        onOpenChange={setAddOpen}
        rooms={rooms}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
