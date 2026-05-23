'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UserCheck,
  Clock,
  CheckSquare,
  BookOpen,
  DollarSign,
  Plus,
  UserPlus,
  LogIn,
  LogOut,
  Edit2,
  Loader2,
  Trash2,
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  staffProfile: {
    id: string;
    employeeId: string | null;
    department: string;
    position: string;
    salary: number | null;
    hireDate: string;
    isActive: boolean;
  } | null;
}

interface ClockRecord {
  id: string;
  staffId: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number | null;
  notes: string | null;
  staff: {
    id: string;
    department: string;
    position: string;
    user: { id: string; name: string | null; email: string };
  };
}

interface StaffTaskRecord {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  staffId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  staff: {
    id: string;
    department: string;
    position: string;
    user: { id: string; name: string | null; email: string };
  } | null;
}

interface SOPRecord {
  id: string;
  department: string;
  title: string;
  description: string | null;
  steps: any;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StaffManagerProps {
  staff: StaffUser[];
  clockRecords: ClockRecord[];
  tasks: StaffTaskRecord[];
  sops: SOPRecord[];
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'];
const DEPARTMENTS = [
  'Front Desk',
  'Housekeeping',
  'Maintenance',
  'Food & Beverage',
  'Management',
  'Security',
  'Other',
];

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export function StaffManager({ staff, clockRecords, tasks, sops }: StaffManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState('list');

  // Modals
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addSopOpen, setAddSopOpen] = useState(false);
  const [editSopOpen, setEditSopOpen] = useState(false);
  const [editingSop, setEditingSop] = useState<SOPRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Map staffId -> latest open clock record (today, no clockOut)
  const openClockByStaff = useMemo(() => {
    const m = new Map<string, ClockRecord>();
    for (const r of clockRecords) {
      if (!r.clockOut) {
        const existing = m.get(r.staffId);
        if (!existing || new Date(r.clockIn) > new Date(existing.clockIn)) {
          m.set(r.staffId, r);
        }
      }
    }
    return m;
  }, [clockRecords]);

  const totalSalary = useMemo(
    () =>
      staff
        .filter((s) => s.staffProfile?.isActive && s.isActive)
        .reduce((sum, s) => sum + (s.staffProfile?.salary || 0), 0),
    [staff]
  );

  const activeStaffCount = staff.filter((s) => s.staffProfile?.isActive && s.isActive).length;
  const onDutyCount = openClockByStaff.size;
  const pendingTasksCount = tasks.filter((t) => t.status === 'PENDING').length;

  async function clockIn(staffId: string) {
    setBusyId(staffId);
    try {
      const res = await fetch('/api/admin/staff/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) throw new Error('Clock-in failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to clock in');
    } finally {
      setBusyId(null);
    }
  }

  async function clockOut(recordId: string) {
    setBusyId(recordId);
    try {
      const res = await fetch(`/api/admin/staff/clock/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clockOut: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Clock-out failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to clock out');
    } finally {
      setBusyId(null);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/admin/staff/tasks/${taskId}`, {
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

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/admin/staff/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete task');
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateStaff(staffProfileId: string) {
    if (!confirm('Deactivate this staff member?')) return;
    setBusyId(staffProfileId);
    try {
      const res = await fetch(`/api/admin/staff/${staffProfileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to deactivate');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSop(sopId: string) {
    if (!confirm('Archive this SOP?')) return;
    setBusyId(sopId);
    try {
      const res = await fetch(`/api/admin/staff/sop/${sopId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to archive SOP');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Manage your team, attendance, tasks, and standard operating procedures.
          </p>
        </div>
        <Button onClick={() => setAddStaffOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="h-4 w-4 mr-2" /> Add Staff
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Active Staff</p>
                <p className="text-2xl font-bold">{activeStaffCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">On Duty Now</p>
                <p className="text-2xl font-bold">{onDutyCount}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Tasks</p>
                <p className="text-2xl font-bold">{pendingTasksCount}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Monthly Payroll</p>
                <p className="text-2xl font-bold">
                  ${totalSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="list">
            <UserCheck className="h-4 w-4 mr-2" /> Staff
          </TabsTrigger>
          <TabsTrigger value="clock">
            <Clock className="h-4 w-4 mr-2" /> Clock
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="sop">
            <BookOpen className="h-4 w-4 mr-2" /> SOPs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Staff list */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Staff</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No staff yet. Click "Add Staff" to create the first member.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hire Date</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((s) => {
                        const profile = s.staffProfile;
                        const isOnDuty = profile ? openClockByStaff.has(profile.id) : false;
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div className="font-medium">{s.name || '—'}</div>
                              <div className="text-xs text-gray-500">{s.email}</div>
                            </TableCell>
                            <TableCell>{profile?.employeeId || '—'}</TableCell>
                            <TableCell>{profile?.department || '—'}</TableCell>
                            <TableCell>{profile?.position || '—'}</TableCell>
                            <TableCell>
                              {!profile?.isActive || !s.isActive ? (
                                <Badge className="bg-gray-200 text-gray-700">Inactive</Badge>
                              ) : isOnDuty ? (
                                <Badge className="bg-green-100 text-green-800">On Duty</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">Off Duty</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {profile?.hireDate ? fmtDate(profile.hireDate) : '—'}
                            </TableCell>
                            <TableCell>
                              {profile?.salary != null
                                ? `$${profile.salary.toLocaleString()}`
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingStaff(s);
                                    setEditStaffOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {profile?.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deactivateStaff(profile.id)}
                                    disabled={busyId === profile.id}
                                  >
                                    {busyId === profile.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Clock */}
        <TabsContent value="clock" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff
                      .filter((s) => s.staffProfile?.isActive && s.isActive)
                      .map((s) => {
                        const profile = s.staffProfile!;
                        const open = openClockByStaff.get(profile.id);
                        const todays = clockRecords.filter((r) => r.staffId === profile.id);
                        const latest = todays[0];
                        return (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="font-medium">{s.name || s.email}</div>
                              <div className="text-xs text-gray-500">{profile.position}</div>
                            </TableCell>
                            <TableCell>{profile.department}</TableCell>
                            <TableCell>
                              {open ? (
                                <Badge className="bg-green-100 text-green-800">On Duty</Badge>
                              ) : latest ? (
                                <Badge className="bg-gray-100 text-gray-700">Off Duty</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  Not Clocked In
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{latest ? fmtTime(latest.clockIn) : '—'}</TableCell>
                            <TableCell>
                              {latest && latest.clockOut ? fmtTime(latest.clockOut) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {open ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => clockOut(open.id)}
                                  disabled={busyId === open.id}
                                >
                                  {busyId === open.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <LogOut className="h-4 w-4 mr-2" /> Clock Out
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => clockIn(profile.id)}
                                  disabled={busyId === profile.id}
                                  className="bg-teal-600 hover:bg-teal-700"
                                >
                                  {busyId === profile.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <LogIn className="h-4 w-4 mr-2" /> Clock In
                                    </>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Tasks */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Staff Tasks</CardTitle>
              <Button
                size="sm"
                onClick={() => setAddTaskOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" /> New Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No tasks yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="font-medium">{t.title}</div>
                            {t.description && (
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {t.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {t.staff?.user.name || t.staff?.user.email || (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={priorityColors[t.priority]}>{t.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <select
                              value={t.status}
                              onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                              disabled={busyId === t.id}
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              {STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="text-sm">{fmtDate(t.dueDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(t.id)}
                              disabled={busyId === t.id}
                            >
                              {busyId === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SOPs */}
        <TabsContent value="sop" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Standard Operating Procedures</CardTitle>
              <Button
                size="sm"
                onClick={() => setAddSopOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" /> New SOP
              </Button>
            </CardHeader>
            <CardContent>
              {sops.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No SOPs yet.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {sops.map((sop) => {
                    const steps = Array.isArray(sop.steps) ? sop.steps : [];
                    return (
                      <Card key={sop.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">{sop.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{sop.department}</Badge>
                                <span className="text-xs text-gray-500">v{sop.version}</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSop(sop);
                                  setEditSopOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSop(sop.id)}
                                disabled={busyId === sop.id}
                              >
                                {busyId === sop.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {sop.description && (
                            <p className="text-sm text-gray-600 mb-3">{sop.description}</p>
                          )}
                          <ol className="text-sm space-y-2 list-decimal list-inside">
                            {steps.map((s: any, i: number) => (
                              <li key={i}>
                                <span className="font-medium">{s.step}</span>
                                {s.description && (
                                  <span className="text-gray-500"> — {s.description}</span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddStaffModal
        open={addStaffOpen}
        onOpenChange={setAddStaffOpen}
        onSaved={() => router.refresh()}
      />
      <EditStaffModal
        open={editStaffOpen}
        onOpenChange={(o) => {
          setEditStaffOpen(o);
          if (!o) setEditingStaff(null);
        }}
        staff={editingStaff}
        onSaved={() => router.refresh()}
      />
      <AddTaskModal
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        staff={staff}
        onSaved={() => router.refresh()}
      />
      <SopModal
        open={addSopOpen}
        onOpenChange={setAddSopOpen}
        onSaved={() => router.refresh()}
      />
      <SopModal
        open={editSopOpen}
        onOpenChange={(o) => {
          setEditSopOpen(o);
          if (!o) setEditingSop(null);
        }}
        editing={editingSop}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

/* -------------------- Add Staff Modal -------------------- */

function AddStaffModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('FRONT_DESK');
  const [salary, setSalary] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  // Success state with the invite URL — shown after the API responds 201.
  const [invite, setInvite] = useState<{
    url: string;
    emailSent: boolean;
    emailReason?: string | null;
    recipientName: string;
    recipientEmail: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setEmployeeId('');
    setDepartment(DEPARTMENTS[0]);
    setPosition('');
    setRole('FRONT_DESK');
    setSalary('');
    setHireDate(new Date().toISOString().slice(0, 10));
    setInvite(null);
    setCopied(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          department,
          position,
          employeeId: employeeId || undefined,
          salary: salary ? Number(salary) : undefined,
          hireDate,
          role,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Create failed');
      }
      const data = await res.json();
      setInvite({
        url: data?.invite?.url ?? '',
        emailSent: Boolean(data?.invite?.emailSent),
        emailReason: data?.invite?.emailReason ?? null,
        recipientName: name,
        recipientEmail: email,
      });
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to add staff');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers — fallback to a prompt the admin can copy from.
      window.prompt('Copy this invite URL', invite.url);
    }
  }

  function closeAndReset() {
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-email">Email</Label>
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-emp">Employee ID</Label>
              <Input
                id="s-emp"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-role">Role</Label>
              <select
                id="s-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-dept">Department</Label>
              <select
                id="s-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-pos">Position</Label>
              <Input
                id="s-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-salary">Salary (monthly)</Label>
              <Input
                id="s-salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-hire">Hire Date</Label>
              <Input
                id="s-hire"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            They&apos;ll get an emailed invite link with a 7-day expiry to set
            their own password. If email isn&apos;t configured we&apos;ll show you the
            link to share manually.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeAndReset}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
        {invite && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
              <strong>{invite.recipientName}</strong> ({invite.recipientEmail}) added.{' '}
              {invite.emailSent
                ? 'We emailed them the invite link.'
                : 'Email delivery is not configured yet — copy the link below and share it directly.'}
            </div>
            <div>
              <Label className="text-xs">Invite link (expires in 7 days)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  readOnly
                  value={invite.url}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={copyInvite}
                  variant="outline"
                  className="shrink-0"
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Send via WhatsApp, Slack, or SMS if email didn&apos;t reach them.
              </p>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={closeAndReset} className="bg-teal-600 hover:bg-teal-700">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Edit Staff Modal -------------------- */

function EditStaffModal({
  open,
  onOpenChange,
  staff,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: StaffUser | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [salary, setSalary] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (staff?.staffProfile) {
      setDepartment(staff.staffProfile.department);
      setPosition(staff.staffProfile.position);
      setEmployeeId(staff.staffProfile.employeeId || '');
      setSalary(staff.staffProfile.salary?.toString() || '');
      setHireDate(staff.staffProfile.hireDate.slice(0, 10));
      setIsActive(staff.staffProfile.isActive);
    }
  }, [staff]);

  if (!staff?.staffProfile) return null;
  const profileId = staff.staffProfile.id;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/staff/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          position,
          employeeId: employeeId || null,
          salary: salary ? Number(salary) : null,
          hireDate,
          isActive,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Staff: {staff.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Department</Label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Position</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Employee ID</Label>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Salary</Label>
              <Input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Hire Date</Label>
              <Input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                value={isActive ? '1' : '0'}
                onChange={(e) => setIsActive(e.target.value === '1')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Add Task Modal -------------------- */

function AddTaskModal({
  open,
  onOpenChange,
  staff,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: StaffUser[];
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  function reset() {
    setStaffId('');
    setTitle('');
    setDescription('');
    setCategory('');
    setPriority('MEDIUM');
    setDueDate('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffId || null,
          title,
          description: description || null,
          category: category || null,
          priority,
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Staff Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Assign To</Label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {staff
                  .filter((s) => s.staffProfile?.isActive && s.isActive)
                  .map((s) => (
                    <option key={s.staffProfile!.id} value={s.staffProfile!.id}>
                      {s.name || s.email}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Cleaning"
              />
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- SOP Modal (create + edit) -------------------- */

function SopModal({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: SOPRecord | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<{ step: string; description: string }[]>([
    { step: '', description: '' },
  ]);

  useEffect(() => {
    if (editing) {
      setDepartment(editing.department);
      setTitle(editing.title);
      setDescription(editing.description || '');
      const incoming = Array.isArray(editing.steps) ? editing.steps : [];
      setSteps(
        incoming.length > 0
          ? incoming.map((s: any) => ({ step: s.step || '', description: s.description || '' }))
          : [{ step: '', description: '' }]
      );
    } else {
      setDepartment(DEPARTMENTS[0]);
      setTitle('');
      setDescription('');
      setSteps([{ step: '', description: '' }]);
    }
  }, [editing, open]);

  function updateStep(idx: number, field: 'step' | 'description', value: string) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { step: '', description: '' }]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanedSteps = steps.filter((s) => s.step.trim().length > 0);
      const url = editing ? `/api/admin/staff/sop/${editing.id}` : '/api/admin/staff/sop';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          title,
          description: description || null,
          steps: cleanedSteps,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      alert('Failed to save SOP');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit SOP' : 'New SOP'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Department</Label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <Button type="button" size="sm" variant="outline" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" /> Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="text-sm font-mono text-gray-400 mt-2.5">{idx + 1}.</span>
                  <div className="flex-1 space-y-1">
                    <Input
                      value={s.step}
                      onChange={(e) => updateStep(idx, 'step', e.target.value)}
                      placeholder="Step name"
                    />
                    <Input
                      value={s.description}
                      onChange={(e) => updateStep(idx, 'description', e.target.value)}
                      placeholder="Description (optional)"
                    />
                  </div>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
