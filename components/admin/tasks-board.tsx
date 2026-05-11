'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, RefreshCw, Search, ArrowRight, Clock,
  Sparkles, BedDouble, Wrench, ShoppingBag, Truck,
  User, Plane, Car, Gift, CheckCircle2, Circle,
  AlertCircle, CalendarClock,
} from 'lucide-react';
import Link from 'next/link';

interface TaskItem {
  id: string;
  sourceId: string;
  source: string;
  sourceLabel: string;
  category: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  completedAt?: string | null;
  room?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  link: string;
  bookingRef?: string | null;
  createdAt: string;
}

const SOURCE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  STAFF:        { label: 'Staff',        color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',  icon: <User className="h-3 w-3" /> },
  HOUSEKEEPING: { label: 'Housekeeping', color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-200',      icon: <Sparkles className="h-3 w-3" /> },
  MAINTENANCE:  { label: 'Maintenance',  color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',  icon: <Wrench className="h-3 w-3" /> },
  SERVICE:      { label: 'Room Service', color: 'text-pink-700',    bg: 'bg-pink-50 border-pink-200',      icon: <ShoppingBag className="h-3 w-3" /> },
  LOGISTICS:    { label: 'Logistics',    color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200',  icon: <Truck className="h-3 w-3" /> },
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  TRANSFER:       <Car className="h-3.5 w-3.5 text-blue-500" />,
  AIRPORT_PICKUP: <Plane className="h-3.5 w-3.5 text-sky-500" />,
  ARRIVAL_WELCOME:<Gift className="h-3.5 w-3.5 text-green-500" />,
  CLEANING:       <Sparkles className="h-3.5 w-3.5 text-teal-500" />,
  TURNOVER:       <BedDouble className="h-3.5 w-3.5 text-blue-500" />,
  LAUNDRY:        <Sparkles className="h-3.5 w-3.5 text-pink-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'text-yellow-600',
  IN_PROGRESS: 'text-blue-600',
  COMPLETED:   'text-green-600',
  CANCELLED:   'text-gray-400',
  RESOLVED:    'text-green-600',
  REPORTED:    'text-yellow-600',
  DRAFT:       'text-gray-500',
  SENT:        'text-blue-500',
  DELIVERED:   'text-green-600',
};

const SOURCE_FILTERS = [
  { label: 'All Sources', value: 'ALL' },
  { label: 'Bookings',    value: 'STAFF', sub: 'BOOKING' },
  { label: 'Housekeeping',value: 'HOUSEKEEPING' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Room Service',value: 'SERVICE' },
  { label: 'Logistics',   value: 'LOGISTICS' },
  { label: 'Staff',       value: 'STAFF' },
];

const STATUS_GROUPS = [
  { label: 'Open',      statuses: ['PENDING', 'IN_PROGRESS', 'REPORTED', 'DRAFT', 'SENT'] },
  { label: 'Done',      statuses: ['COMPLETED', 'RESOLVED', 'DELIVERED'] },
  { label: 'Cancelled', statuses: ['CANCELLED'] },
];

function isOverdue(dueDate?: string | null, status?: string) {
  if (!dueDate) return false;
  if (['COMPLETED', 'RESOLVED', 'DELIVERED', 'CANCELLED'].includes(status ?? '')) return false;
  return new Date(dueDate) < new Date();
}

function TaskCard({
  task,
  onStatusChange,
  busy,
}: {
  task: TaskItem;
  onStatusChange: (id: string, status: string) => void;
  busy: boolean;
}) {
  const meta = SOURCE_META[task.source] ?? SOURCE_META.STAFF;
  const catIcon = CATEGORY_ICON[task.category];
  const overdue = isOverdue(task.dueDate, task.status);
  const isOpen = !['COMPLETED', 'RESOLVED', 'DELIVERED', 'CANCELLED'].includes(task.status);

  return (
    <Card className={`hover:shadow-md transition-shadow ${overdue ? 'border-red-200' : ''}`}>
      <CardContent className="p-3.5 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
              {meta.icon}{task.sourceLabel}
            </span>
            {task.bookingRef && (
              <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                #{task.bookingRef}
              </span>
            )}
            {task.room && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                Rm {task.room}
              </span>
            )}
            {overdue && isOpen && (
              <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" /> Overdue
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.MEDIUM}`}>
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5">
          {catIcon && <span className="shrink-0">{catIcon}</span>}
          <p className="font-semibold text-sm text-gray-800 leading-tight">{task.title}</p>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${overdue && isOpen ? 'text-red-500' : ''}`}>
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assignedTo}
            </span>
          )}
          <span className={`flex items-center gap-1 font-medium ${STATUS_COLORS[task.status] ?? ''}`}>
            {isOpen ? <Circle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {task.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {task.status === 'PENDING' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Start'}
            </Button>
          )}
          {(task.status === 'IN_PROGRESS' || task.status === 'REPORTED' || task.status === 'SENT') && (
            <Button
              size="sm"
              className="h-7 text-xs bg-green-600 hover:bg-green-700"
              disabled={busy}
              onClick={() => onStatusChange(task.id, 'COMPLETED')}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Done'}
            </Button>
          )}
          <Link href={task.link} className="ml-auto">
            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500 hover:text-gray-800">
              View <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function TasksBoard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusGroup, setStatusGroup] = useState('open');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tasks?source=${sourceFilter}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const openStatuses = new Set(['PENDING', 'IN_PROGRESS', 'REPORTED', 'DRAFT', 'SENT']);
  const doneStatuses = new Set(['COMPLETED', 'RESOLVED', 'DELIVERED']);
  const cancelStatuses = new Set(['CANCELLED']);

  const filtered = tasks.filter((t) => {
    const inGroup =
      statusGroup === 'open' ? openStatuses.has(t.status)
      : statusGroup === 'done' ? doneStatuses.has(t.status)
      : cancelStatuses.has(t.status);
    const inSearch = !search.trim() || t.title.toLowerCase().includes(search.toLowerCase());
    return inGroup && inSearch;
  });

  // Booking tasks (for quick-access section)
  const bookingTasksOpen = tasks.filter(
    (t) => t.sourceLabel === 'Booking' && openStatuses.has(t.status)
  );

  // Counts by source
  const openCount = tasks.filter((t) => openStatuses.has(t.status)).length;
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

  const KANBAN_COLS = [
    { key: 'open',      label: 'Open',      statuses: openStatuses,   color: 'bg-yellow-50 border-yellow-200' },
    { key: 'done',      label: 'Done',      statuses: doneStatuses,   color: 'bg-green-50 border-green-200' },
    { key: 'cancelled', label: 'Cancelled', statuses: cancelStatuses, color: 'bg-gray-50 border-gray-200' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount} open
            {overdueCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {overdueCount} overdue</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="text-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <div className="flex rounded-md border overflow-hidden text-xs">
            {['list', 'kanban'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`px-3 py-1.5 capitalize ${view === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Booking arrival quick-tasks banner */}
      {bookingTasksOpen.length > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-sm text-blue-800">
            <span className="font-semibold">{bookingTasksOpen.length}</span> pending arrival tasks (transfer, pickup, welcome) from recent bookings
          </span>
          <button
            onClick={() => { setSourceFilter('STAFF'); setStatusGroup('open'); }}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium underline"
          >
            View
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-52"
          />
        </div>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="STAFF">Staff / Bookings</SelectItem>
            <SelectItem value="HOUSEKEEPING">Housekeeping</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="SERVICE">Room Service</SelectItem>
            <SelectItem value="LOGISTICS">Logistics</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-md border overflow-hidden text-xs">
          {[['open', 'Open'], ['done', 'Done'], ['cancelled', 'Cancelled']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatusGroup(v)}
              className={`px-3 py-1.5 ${statusGroup === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks found</p>
          <p className="text-sm mt-1">All caught up!</p>
        </div>
      ) : view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={updateStatus}
              busy={busyId === task.id}
            />
          ))}
        </div>
      ) : (
        /* Kanban view */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLS.map((col) => {
            const colTasks = tasks.filter(
              (t) =>
                col.statuses.has(t.status) &&
                (!search.trim() || t.title.toLowerCase().includes(search.toLowerCase()))
            );
            return (
              <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="font-semibold text-gray-800">{col.label}</h2>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border font-medium">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No tasks</p>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={updateStatus}
                        busy={busyId === task.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
