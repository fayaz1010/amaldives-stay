import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const sourceFilter = url.searchParams.get('source') ?? 'ALL';
    const statusFilter = url.searchParams.get('status') ?? 'ALL';

    const statusWhere = statusFilter !== 'ALL' ? { status: statusFilter as any } : {};

    const [staffTasks, hkTasks, maintenanceTasks, serviceOrders, logisticsOrders] =
      await Promise.all([
        // Staff tasks (incl. booking auto-tasks)
        prisma.staffTask.findMany({
          where: { tenantId, ...statusWhere },
          include: {
            staff: { select: { userId: true, department: true, user: { select: { name: true } } } },
            booking: {
              select: {
                id: true,
                confirmationNumber: true,
                checkInDate: true,
                room: { select: { number: true } },
                guest: { select: { name: true, guestProfile: { select: { firstName: true, lastName: true } } } },
              },
            },
          },
          orderBy: { dueDate: 'asc' },
        }),

        // Housekeeping tasks
        prisma.housekeepingTask.findMany({
          where: { tenantId, ...statusWhere },
          include: {
            room: { select: { number: true } },
            assignedUser: { select: { name: true } },
          },
          orderBy: { scheduledDate: 'asc' },
        }),

        // Maintenance requests
        prisma.maintenanceRequest.findMany({
          where: { tenantId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            room: { select: { number: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),

        // Room/extra service orders
        prisma.serviceOrder.findMany({
          where: { tenantId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            room: { select: { number: true } },
            service: { select: { name: true, category: true } },
            guest: { select: { name: true } },
            booking: { select: { room: { select: { number: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        }),

        // Logistics orders
        prisma.logisticsOrder.findMany({
          where: { tenantId, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
          include: {
            items: { select: { name: true, quantity: true } },
          },
          orderBy: { requestedAt: 'asc' },
        }),
      ]);

    // Map everything to a unified TaskItem shape
    const unified: any[] = [];

    // --- Staff tasks ---
    for (const t of staffTasks) {
      const guestProfile = t.booking?.guest?.guestProfile;
      const guestName = guestProfile
        ? `${guestProfile.firstName} ${guestProfile.lastName}`.trim()
        : (t.booking?.guest?.name ?? null);
      unified.push({
        id: `staff:${t.id}`,
        sourceId: t.id,
        source: 'STAFF',
        sourceLabel: t.source === 'BOOKING' ? 'Booking' : 'Staff',
        category: t.category ?? 'GENERAL',
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        room: t.booking?.room?.number ?? null,
        assignedTo: t.staff?.user?.name ?? null,
        notes: t.notes,
        link: t.bookingId ? `/admin/reservations` : `/admin/staff`,
        bookingRef: t.booking?.confirmationNumber ?? null,
        createdAt: t.createdAt.toISOString(),
      });
    }

    // --- Housekeeping tasks ---
    for (const t of hkTasks) {
      unified.push({
        id: `hk:${t.id}`,
        sourceId: t.id,
        source: 'HOUSEKEEPING',
        sourceLabel: 'Housekeeping',
        category: t.taskType,
        title: `${t.taskType.replace(/_/g, ' ')} — Room ${t.room?.number ?? '?'}`,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.scheduledDate?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        room: t.room?.number ?? null,
        assignedTo: t.assignedUser?.name ?? null,
        notes: t.notes,
        link: '/admin/housekeeping',
        bookingRef: null,
        createdAt: t.createdAt.toISOString(),
      });
    }

    // --- Maintenance ---
    for (const t of maintenanceTasks) {
      unified.push({
        id: `maint:${t.id}`,
        sourceId: t.id,
        source: 'MAINTENANCE',
        sourceLabel: 'Maintenance',
        category: t.category ?? 'GENERAL',
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.createdAt.toISOString(),
        completedAt: null,
        room: t.room?.number ?? null,
        assignedTo: null,
        notes: (t as any).notes ?? null,
        link: '/admin/maintenance',
        bookingRef: null,
        createdAt: t.createdAt.toISOString(),
      });
    }

    // --- Service orders ---
    for (const t of serviceOrders) {
      const roomNumber = t.room?.number ?? (t as any).booking?.room?.number ?? null;
      // notes may contain JSON (order items) — show item name × qty instead
      let desc = `Qty: ${t.quantity}`;
      if (t.scheduledDate) {
        desc += ` · Scheduled: ${new Date(t.scheduledDate).toLocaleString()}`;
      }
      const isRoomSvc = !['EXCURSION', 'DIVING', 'SNORKELLING', 'PICNIC', 'FISHING', 'RENTAL'].includes(
        t.service?.category ?? ''
      );
      unified.push({
        id: `svc:${t.id}`,
        sourceId: t.id,
        source: 'SERVICE',
        sourceLabel: isRoomSvc ? 'Room Service' : 'Extra Service',
        category: t.service?.category ?? 'SERVICE',
        title: `${t.service?.name ?? 'Service'} ×${t.quantity} — Room ${roomNumber ?? '?'}`,
        description: desc,
        status: t.status,
        priority: 'MEDIUM',
        dueDate: t.scheduledDate?.toISOString() ?? t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString() ?? null,
        room: roomNumber,
        assignedTo: null,
        notes: null,
        link: isRoomSvc ? '/admin/room-service' : '/admin/extra-services',
        bookingRef: null,
        createdAt: t.createdAt.toISOString(),
      });
    }

    // --- Logistics orders ---
    for (const t of logisticsOrders) {
      const itemSummary = t.items.slice(0, 3).map((i: any) => `${i.name} ×${i.quantity}`).join(', ');
      unified.push({
        id: `logi:${t.id}`,
        sourceId: t.id,
        source: 'LOGISTICS',
        sourceLabel: 'Logistics',
        category: 'ORDER',
        title: t.title,
        description: itemSummary || t.description,
        status: t.status,
        priority: t.urgency,
        dueDate: t.requestedAt.toISOString(),
        completedAt: t.arrivedAt?.toISOString() ?? null,
        room: null,
        assignedTo: t.requestedBy ?? null,
        notes: t.notes,
        link: '/admin/logistics',
        bookingRef: null,
        createdAt: t.createdAt.toISOString(),
      });
    }

    // Apply source filter
    const filtered =
      sourceFilter === 'ALL'
        ? unified
        : unified.filter((t) => t.source === sourceFilter);

    // Sort: pending first, by dueDate
    filtered.sort((a, b) => {
      const aD = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bD = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aD - bD;
    });

    return NextResponse.json({ tasks: filtered });
  } catch (error) {
    console.error('Tasks aggregation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
