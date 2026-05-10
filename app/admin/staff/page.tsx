import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { StaffManager } from '@/components/admin/staff-manager';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [users, clockRecordsRaw, tasksRaw, sopsRaw] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, staffProfile: { is: {} } },
      include: { staffProfile: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staffClockRecord.findMany({
      where: { tenantId, clockIn: { gte: todayStart, lte: todayEnd } },
      include: {
        staff: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { clockIn: 'desc' },
    }),
    prisma.staffTask.findMany({
      where: { tenantId },
      include: {
        staff: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staffSOP.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ department: 'asc' }, { title: 'asc' }],
    }),
  ]);

  const staff = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    staffProfile: u.staffProfile
      ? {
          id: u.staffProfile.id,
          employeeId: u.staffProfile.employeeId,
          department: u.staffProfile.department,
          position: u.staffProfile.position,
          permissions: u.staffProfile.permissions,
          salary: u.staffProfile.salary,
          hireDate: u.staffProfile.hireDate.toISOString(),
          isActive: u.staffProfile.isActive,
        }
      : null,
  }));

  const clockRecords = clockRecordsRaw.map((r) => ({
    id: r.id,
    staffId: r.staffId,
    clockIn: r.clockIn.toISOString(),
    clockOut: r.clockOut ? r.clockOut.toISOString() : null,
    breakMinutes: r.breakMinutes,
    notes: r.notes,
    staff: {
      id: r.staff.id,
      department: r.staff.department,
      position: r.staff.position,
      user: r.staff.user,
    },
  }));

  const tasks = tasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    staffId: t.staffId,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    staff: t.staff
      ? {
          id: t.staff.id,
          department: t.staff.department,
          position: t.staff.position,
          user: t.staff.user,
        }
      : null,
  }));

  const sops = sopsRaw.map((s) => ({
    id: s.id,
    department: s.department,
    title: s.title,
    description: s.description,
    steps: s.steps,
    version: s.version,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return <StaffManager staff={staff} clockRecords={clockRecords} tasks={tasks} sops={sops} />;
}
