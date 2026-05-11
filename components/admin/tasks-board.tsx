'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, RefreshCw, Search, ArrowRight, Clock,
  Sparkles, BedDouble, Wrench, ShoppingBag, Truck,
  User, Plane, Car, Gift, CheckCircle2, Circle,
  AlertCircle, CalendarClock, RefreshCcw, ChevronDown, ChevronRight,
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

const SOURCE_ORDER = ['STAFF', 'HOUSEKEEPING', 'SERVICE', 'MAINTENANCE', 'LOGISTICS'];

const SOURCE_META: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  STAFF:        { label: 'Booking & Staff',  color: 'text-indigo-700',  bg: 'bg-indigo-50',  dot: 'bg-indigo-400',  icon: <User className="h-3.5 w-3.5" /> },
  HOUSEKEEPING: { label: 'Housekeeping',     color: 'text-teal-700',    bg: 'bg-teal-50',    dot: 'bg-teal-400',    icon: <Sparkles className="h-3.5 w-3.5" /> },
  SERVICE:      { label: 'Room & Extra Svc', color: 'text-pink-700',    bg: 'bg-pink-50',    dot: 'bg-pink-400',    icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  MAINTENANCE:  { label: 'Maintenance',      color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-400',  icon: <Wrench className="h-3.5 w-3.5" /> },
  LOGISTICS:    { label: 'Logistics',        color: 'text-yellow-700',  bg: 'bg-yellow-50',  dot: 'bg-yellow-500',  icon: <Truck className="h-3.5 w-3.5" /> },
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  TRANSFER:       <Car className="h-3.5 w-3.5 text-blue-400" />,
  AIRPORT_PICKUP: <Plane className="h-3.5 w-3.5 text-sky-400" />,
  ARRIVAL_WELCOME:<Gift className="h-3.5 w-3.5 text-green-400" />,
  CLEANING:       <Sparkles className="h-3.5 w-3.5 text-teal-400" />,
  TURNOVER:       <BedDouble className="h-3.5 w-3.5 text-blue-400" />,
};

const PRIORITY_DOT: Record<string, string> = {
  LOW:    'bg-gray-300',
  MEDIUM: 'bg-yellow-400',
  HIGH:   'bg-orange-400',
  URGENT: 'bg-red-500',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW:    'text-gray-500',
  MEDIUM: 'text-yellow-600',
  HIGH:   'text-orange-600',
  URGENT: 'text-red-600 font-semibold',
};

const openStatuses = new Set(['PENDING', 'IN_PROGRESS', 'REPORTED', 'ASSIGNED', 'DRAFT', 'SENT', 'IN_TRANSIT', 'CONFIRMED']);
const doneStatuses = new Set(['COMPLETED', 'DELIVERED']);
const cancelStatuses = new Set(['CANCELLED']);

function isOverdue(dueDate?: string | null, status?: string) {
  if (!dueDate) return false;
  if (doneStatuses.has(status ?? '') || cancelStatuses.has(status ?? '')) return false;
  return new Date(dueDate) < new Date();
}

function formatDate(d?: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ---- Task Row ----
function TaskRow({
  task,
  onStatusChange,
  busy,
}: {
  task: TaskItem;
  onStatusChange: (id: string, status: string) => void;
  busy: boolean;
}) {
  const catIcon = CATEGORY_ICON[task.category];
  const overdue = isOverdue(task.dueDate, task.status);
  const isOpen = openStatuses.has(task.status);
  const dateStr = formatDate(task.dueDate);

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50/40' : ''}`}>
      {/* Status indicator */}
      <div className="shrink-0 w-5 flex justify-center">
        {isOpen
          ? <Circle className="h-4 w-4 text-gray-300" />
          : <CheckCircle2 className="h-4 w-4 text-green-400" />}
      </div>

      {/* Category icon */}
      {catIcon && <div className="shrink-0">{catIcon}</div>}

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!isOpen ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
        )}
      </div>

      {/* Booking ref */}
      {task.bookingRef && (
        <span className="shrink-0 text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hidden sm:block">
          #{task.bookingRef}
        </span>
      )}

      {/* Room */}
      {task.room && (
        <span className="shrink-0 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded hidden md:block">
          Rm {task.room}
        </span>
      )}

      {/* Priority dot */}
      <div className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.MEDIUM}`} title={task.priority} />

      {/* Due date */}
      {dateStr && (
        <span className={`shrink-0 text-xs hidden lg:block ${overdue && isOpen ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {overdue && isOpen && <AlertCircle className="h-3 w-3 inline mr-0.5" />}
          {dateStr}
        </span>
      )}

      {/* Assigned */}
      {task.assignedTo && (
        <span className="shrink-0 text-xs text-gray-400 hidden xl:block truncate max-w-[100px]">
          {task.assignedTo}
        </span>
      )}

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1.5">
        {task.status === 'PENDING' && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] px-2"
            disabled={busy}
            onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Start'}
          </Button>
        )}
        {(task.status === 'IN_PROGRESS' || task.status === 'REPORTED' || task.status === 'SENT' || task.status === 'IN_TRANSIT') && (
          <Button
            size="sm"
            className="h-6 text-[11px] px-2 bg-green-600 hover:bg-green-700"
            disabled={busy}
            onClick={() => onStatusChange(task.id, 'COMPLETED')}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Done'}
          </Button>
        )}
        <Link href={task.link}>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700">
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---- Task Group ----
function TaskGroup({
  source,
  tasks,
  onStatusChange,
  busyId,
  defaultOpen = true,
}: {
  source: string;
  tasks: TaskItem[];
  onStatusChange: (id: string, status: string) => void;
  busyId: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SOURCE_META[source] ?? SOURCE_META.STAFF;
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

  // For STAFF/Booking source, sub-group by bookingRef
  const renderRows = () => {
    if (source === 'STAFF') {
      const byBooking: Record<string, TaskItem[]> = {};
      const noBooking: TaskItem[] = [];
      for (const t of tasks) {
        if (t.bookingRef) {
          (byBooking[t.bookingRef] = byBooking[t.bookingRef] ?? []).push(t);
        } else {
          noBooking.push(t);
        }
      }
      return (
        <>
          {Object.entries(byBooking).map(([ref, bookingTasks]) => (
            <div key={ref} className="border-l-2 border-indigo-200 ml-0">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50/60 border-b text-xs text-indigo-600 font-medium">
                <CalendarClock className="h-3 w-3" />
                Booking #{ref}
                <span className="text-indigo-400 font-normal">· {bookingTasks[0]?.room ? `Rm ${bookingTasks[0].room}` : ''}</span>
              </div>
              {bookingTasks.map((t) => (
                <TaskRow key={t.id} task={t} onStatusChange={onStatusChange} busy={busyId === t.id} />
              ))}
            </div>
          ))}
          {noBooking.map((t) => (
            <TaskRow key={t.id} task={t} onStatusChange={onStatusChange} busy={busyId === t.id} />
          ))}
        </>
      );
    }
    return tasks.map((t) => (
      <TaskRow key={t.id} task={t} onStatusChange={onStatusChange} busy={busyId === t.id} />
    ));
  };

  return (
    <div className="rounded-lg border bg-white overflow-hidden mb-3">
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 ${meta.bg} hover:brightness-95 transition-all`}
      >
        <span className={`${meta.color}`}>{meta.icon}</span>
        <span className={`font-semibold text-sm ${meta.color}`}>{meta.label}</span>
        <span className="text-xs bg-white/70 rounded-full px-2 py-0.5 font-medium text-gray-600 ml-0.5">
          {tasks.length}
        </span>
        {overdueCount > 0 && (
          <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium flex items-center gap-0.5">
            <AlertCircle className="h-3 w-3" /> {overdueCount} overdue
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {/* Rows */}
      {open && (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 border-b text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            <div className="w-5 shrink-0" />
            <div className="flex-1">Task</div>
            <div className="hidden md:block w-16 text-center">Room</div>
            <div className="w-2 shrink-0" />
            <div className="hidden lg:block w-16 text-right">Due</div>
            <div className="w-24 text-right">Action</div>
          </div>
          {renderRows()}
        </div>
      )}
    </div>
  );
}

// ---- Kanban Card ----
function KanbanCard({
  task,
  onStatusChange,
  busy,
}: {
  task: TaskItem;
  onStatusChange: (id: string, status: string) => void;
  busy: boolean;
}) {
  const meta = SOURCE_META[task.source] ?? SOURCE_META.STAFF;
  const overdue = isOverdue(task.dueDate, task.status);
  const catIcon = CATEGORY_ICON[task.category];

  return (
    <div className={`bg-white rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow ${overdue ? 'border-red-200' : ''}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
          {meta.icon} {task.sourceLabel}
        </span>
        {task.bookingRef && (
          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{task.bookingRef}</span>
        )}
        {task.room && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Rm {task.room}</span>}
        {overdue && openStatuses.has(task.status) && (
          <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <AlertCircle className="h-3 w-3" /> Overdue
          </span>
        )}
        <span className={`ml-auto text-[10px] font-bold ${PRIORITY_LABEL[task.priority] ?? ''}`}>{task.priority}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {catIcon && <span className="shrink-0">{catIcon}</span>}
        <p className="text-sm font-medium text-gray-800 leading-tight">{task.title}</p>
      </div>
      {task.description && <p className="text-xs text-gray-400 line-clamp-1">{task.description}</p>}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[11px] text-gray-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />{formatDate(task.dueDate) ?? '—'}
        </span>
        <div className="flex items-center gap-1">
          {task.status === 'PENDING' && (
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" disabled={busy} onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Start'}
            </Button>
          )}
          {(task.status === 'IN_PROGRESS' || task.status === 'REPORTED' || task.status === 'SENT' || task.status === 'IN_TRANSIT') && (
            <Button size="sm" className="h-6 text-[11px] px-2 bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => onStatusChange(task.id, 'COMPLETED')}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Done'}
            </Button>
          )}
          <Link href={task.link}>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400"><ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---- Main Board ----
export function TasksBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusGroup, setStatusGroup] = useState('open');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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

  async function updateStatus(id: string, newStatus: string) {
    // Optimistic update — swap status in place immediately, no full reload
    const prev = tasks.find((t) => t.id === id);
    setTasks((all) =>
      all.map((t) =>
        t.id === id
          ? { ...t, status: newStatus, completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : t.completedAt }
          : t
      )
    );
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok && prev) {
        // Revert on error
        setTasks((all) => all.map((t) => (t.id === id ? prev : t)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function syncTasks() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/tasks/backfill', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data.created > 0
        ? `Synced ${data.created} tasks for ${data.bookings} booking(s)`
        : 'All bookings already have tasks');
      if (data.created > 0) await load();
    } finally {
      setSyncing(false);
    }
  }

  const filtered = tasks.filter((t) => {
    const inGroup =
      statusGroup === 'open' ? openStatuses.has(t.status)
      : statusGroup === 'done' ? doneStatuses.has(t.status)
      : cancelStatuses.has(t.status);
    const inSearch = !search.trim() || t.title.toLowerCase().includes(search.toLowerCase());
    return inGroup && inSearch;
  });

  // Group by source
  const grouped: Record<string, TaskItem[]> = {};
  for (const t of filtered) {
    (grouped[t.source] = grouped[t.source] ?? []).push(t);
  }

  const openCount = tasks.filter((t) => openStatuses.has(t.status)).length;
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const bookingTasksOpen = tasks.filter((t) => t.sourceLabel === 'Booking' && openStatuses.has(t.status));

  const KANBAN_COLS = [
    { key: 'open',      label: 'Open',      statuses: openStatuses,   color: 'bg-yellow-50 border-yellow-200' },
    { key: 'done',      label: 'Done',      statuses: doneStatuses,   color: 'bg-green-50 border-green-200' },
    { key: 'cancelled', label: 'Cancelled', statuses: cancelStatuses, color: 'bg-gray-50 border-gray-200' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount} open
            {overdueCount > 0 && <span className="ml-2 text-red-500 font-medium">· {overdueCount} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="text-xs h-8">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="outline" size="sm" onClick={syncTasks} disabled={syncing}
            className="text-xs h-8 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />}
            Sync Tasks
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

      {/* Sync result */}
      {syncResult && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <RefreshCcw className="h-4 w-4 text-blue-500 shrink-0" />
          <span>{syncResult}</span>
          <button onClick={() => setSyncResult(null)} className="ml-auto text-blue-400 hover:text-blue-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Booking banner */}
      {bookingTasksOpen.length > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-sm text-blue-800">
            <span className="font-semibold">{bookingTasksOpen.length}</span> pending arrival tasks from recent bookings
          </span>
          <button onClick={() => { setSourceFilter('STAFF'); setStatusGroup('open'); }} className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium underline">
            View
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-48"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-8 text-xs w-40 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="STAFF">Staff / Bookings</SelectItem>
            <SelectItem value="HOUSEKEEPING">Housekeeping</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="SERVICE">Room Service</SelectItem>
            <SelectItem value="LOGISTICS">Logistics</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border overflow-hidden text-xs shrink-0">
          {[['open', 'Open'], ['done', 'Done'], ['cancelled', 'Cancelled']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatusGroup(v)}
              className={`px-3 py-1.5 whitespace-nowrap ${statusGroup === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
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
        /* Grouped list view */
        <div>
          {SOURCE_ORDER.filter((s) => grouped[s]?.length).map((source) => (
            <TaskGroup
              key={source}
              source={source}
              tasks={grouped[source]}
              onStatusChange={updateStatus}
              busyId={busyId}
              defaultOpen={true}
            />
          ))}
          {/* Any source not in SOURCE_ORDER */}
          {Object.keys(grouped)
            .filter((s) => !SOURCE_ORDER.includes(s))
            .map((source) => (
              <TaskGroup key={source} source={source} tasks={grouped[source]} onStatusChange={updateStatus} busyId={busyId} />
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
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border font-medium">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">No tasks</p>
                    : colTasks.map((task) => (
                      <KanbanCard key={task.id} task={task} onStatusChange={updateStatus} busy={busyId === task.id} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
