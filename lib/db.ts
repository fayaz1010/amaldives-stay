
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Tenant-aware database functions
export async function getTenantById(id: string) {
  return await prisma.tenant.findUnique({
    where: { id },
    include: {
      properties: true,
      users: {
        include: {
          guestProfile: true,
          staffProfile: true,
        },
      },
      _count: {
        select: {
          users: true,
          properties: true,
          bookings: true,
        },
      },
    },
  });
}

export async function getTenantBySubdomain(subdomain: string) {
  return await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      properties: true,
    },
  });
}

// Multi-tenant query wrapper
export class TenantDb {
  private tenantId: string;
  private propertyId?: string;

  /**
   * @param tenantId   the operator account
   * @param propertyId optional active property — when set, the property-scoped
   *                   getters (bookings, rooms, dashboard stats) filter to it.
   *                   Omit for tenant-wide (single-property tenants / account views).
   */
  constructor(tenantId: string, propertyId?: string | null) {
    this.tenantId = tenantId;
    this.propertyId = propertyId ?? undefined;
  }

  /** Spread helper: `{ propertyId }` when scoped, else `{}`. */
  private get propScope(): { propertyId?: string } {
    return this.propertyId ? { propertyId: this.propertyId } : {};
  }

  // Booking queries
  async getBookings(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...this.propScope, ...rest };
    return await prisma.booking.findMany({
      where,
      ...(limit ? { take: limit } : {}),
      ...(limit ? { take: limit } : {}),
      include: {
        guest: {
          include: {
            guestProfile: true,
          },
        },
        room: {
          include: {
            property: true,
          },
        },
        payments: true,
        serviceOrders: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingById(id: string) {
    return await prisma.booking.findFirst({
      where: { id, tenantId: this.tenantId },
      include: {
        guest: {
          include: {
            guestProfile: true,
          },
        },
        room: {
          include: {
            property: true,
          },
        },
        payments: true,
        serviceOrders: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async createBooking(data: any) {
    // Auto-calculate commission fee for amaldives.com bookings
    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId },
      select: { commissionRate: true },
    });
    const commissionRate = tenant?.commissionRate ?? 0.04;
    const platformFee = (data.totalAmount || 0) * commissionRate;

    return await prisma.booking.create({
      data: {
        ...data,
        tenantId: this.tenantId,
        platformFee,
      },
      include: {
        guest: {
          include: {
            guestProfile: true,
          },
        },
        room: {
          include: {
            property: true,
          },
        },
      },
    });
  }

  async updateBooking(id: string, data: any) {
    return await prisma.booking.update({
      where: { id, tenantId: this.tenantId },
      data,
    });
  }

  // Room queries
  async getRooms(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...this.propScope, ...rest };
    return await prisma.room.findMany({
      where,
      include: {
        property: true,
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN'],
            },
          },
        },
        housekeepingTasks: {
          where: {
            status: {
              in: ['PENDING', 'IN_PROGRESS'],
            },
          },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async getRoomById(id: string) {
    return await prisma.room.findFirst({
      where: { id, tenantId: this.tenantId },
      include: {
        property: true,
        bookings: {
          include: {
            guest: {
              include: {
                guestProfile: true,
              },
            },
          },
        },
        housekeepingTasks: {
          include: {
            assignedUser: true,
          },
        },
        maintenanceRequests: {
          include: {
            reporter: true,
            assignedUser: true,
          },
        },
      },
    });
  }

  async createRoom(data: any) {
    // Room.propertyId is required. The onboarding wizard sends the payload
    // without propertyId (it doesn't know the id), and legacy tenants
    // claimed before fix/onboard-default-property have no Property at all,
    // so we resolve the property here — and lazily create one if missing —
    // before delegating to Prisma. Without this, `/api/admin/rooms` POST
    // 500s for any tenant in that state.
    let propertyId: string | undefined = data?.propertyId;
    if (!propertyId) {
      const existing = await prisma.property.findFirst({
        where: { tenantId: this.tenantId },
        select: { id: true },
      });
      if (existing) {
        propertyId = existing.id;
      } else {
        const tenant = await prisma.tenant.findUnique({
          where: { id: this.tenantId },
          select: { name: true },
        });
        const created = await prisma.property.create({
          data: {
            tenantId: this.tenantId,
            name: tenant?.name ?? 'Property 1',
            address: '—',
            city: '—',
            state: '—',
            country: 'Maldives',
            zipCode: '—',
            phone: '—',
            email: '—',
          },
        });
        propertyId = created.id;
      }
    }

    return await prisma.room.create({
      data: {
        ...data,
        propertyId,
        tenantId: this.tenantId,
      },
    });
  }

  async updateRoom(id: string, data: any) {
    return await prisma.room.update({
      where: { id, tenantId: this.tenantId },
      data,
    });
  }

  // Staff queries
  async getStaff(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...rest };
    return await prisma.user.findMany({
      where: {
        staffProfile: {
          ...where,
        },
      },
      include: {
        staffProfile: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStaffById(id: string) {
    return await prisma.user.findFirst({
      where: {
        id,
        staffProfile: {
          tenantId: this.tenantId,
        },
      },
      include: {
        staffProfile: true,
      },
    });
  }

  // Housekeeping queries
  async getHousekeepingTasks(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...rest };
    return await prisma.housekeepingTask.findMany({
      where,
      ...(limit ? { take: limit } : {}),
      include: {
        room: {
          include: {
            property: true,
          },
        },
        assignedUser: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async createHousekeepingTask(data: any) {
    return await prisma.housekeepingTask.create({
      data: {
        ...data,
        tenantId: this.tenantId,
      },
    });
  }

  async updateHousekeepingTask(id: string, data: any) {
    return await prisma.housekeepingTask.update({
      where: { id, tenantId: this.tenantId },
      data,
    });
  }

  // Maintenance queries
  async getMaintenanceRequests(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...rest };
    return await prisma.maintenanceRequest.findMany({
      where,
      include: {
        room: true,
        reporter: true,
        assignedUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaintenanceRequest(data: any) {
    return await prisma.maintenanceRequest.create({
      data: {
        ...data,
        tenantId: this.tenantId,
      },
    });
  }

  async updateMaintenanceRequest(id: string, data: any) {
    return await prisma.maintenanceRequest.update({
      where: { id, tenantId: this.tenantId },
      data,
    });
  }

  // Inventory queries
  async getInventoryItems(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...rest };
    return await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getLowStockItems() {
    return await prisma.inventoryItem.findMany({
      where: {
        tenantId: this.tenantId,
        currentStock: {
          lte: prisma.inventoryItem.fields.minStock,
        },
      },
      orderBy: { currentStock: 'asc' },
    });
  }

  // Service queries
  async getServices(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...rest };
    return await prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getServiceOrders(filters?: any) {
    const { limit, ...rest } = filters || {};
    const where = { tenantId: this.tenantId, ...rest };
    return await prisma.serviceOrder.findMany({
      where,
      include: {
        service: true,
        guest: {
          include: {
            guestProfile: true,
          },
        },
        booking: {
          include: {
            room: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Analytics queries
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Property scope applied to room/booking/payment metrics (all have propertyId).
    // staffTask has no propertyId yet, so the pending-tasks count stays account-wide.
    const ps = this.propScope;
    const [rooms, bookings, monthlyPaid, todayCheckIns, todayCheckOuts, pendingTasksCount, openBookings] = await Promise.all([
      prisma.room.findMany({
        where: { tenantId: this.tenantId, ...ps },
        select: { status: true },
      }),
      prisma.booking.findMany({
        where: {
          tenantId: this.tenantId,
          ...ps,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        select: { totalAmount: true, paidAmount: true, status: true },
      }),
      // Monthly revenue = all payments received this month
      prisma.payment.aggregate({
        where: {
          tenantId: this.tenantId,
          ...ps,
          status: 'COMPLETED',
          processedAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      prisma.booking.count({
        where: {
          tenantId: this.tenantId,
          ...ps,
          checkInDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.booking.count({
        where: {
          tenantId: this.tenantId,
          ...ps,
          checkOutDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.staffTask.count({
        where: {
          tenantId: this.tenantId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      // Open receivables: confirmed/in-house bookings with outstanding balance
      prisma.booking.findMany({
        where: {
          tenantId: this.tenantId,
          ...ps,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
    const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
    const cleaningRooms = rooms.filter(r => r.status === 'CLEANING').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const averageDailyRate = occupiedRooms > 0 ? totalRevenue / occupiedRooms : 0;
    const revPAR = totalRooms > 0 ? totalRevenue / totalRooms : 0;
    const openReceivables = openBookings.reduce((s, b) => s + Math.max(0, b.totalAmount - b.paidAmount), 0);

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      cleaningRooms,
      maintenanceRooms,
      todayCheckIns,
      todayCheckOuts,
      pendingTasksCount,
      openReceivables,
      totalRevenue,
      monthlyRevenue: monthlyPaid._sum.amount || 0,
      occupancyRate,
      averageDailyRate,
      revPAR,
    };
  }

  async getRevenueData(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: this.tenantId,
        status: 'CHECKED_OUT',
        checkOutDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        checkOutDate: true,
        totalAmount: true,
      },
    });

    // Group by date
    const revenueByDate = bookings.reduce((acc, booking) => {
      const date = booking.checkOutDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { revenue: 0, bookings: 0 };
      }
      acc[date].revenue += booking.totalAmount;
      acc[date].bookings += 1;
      return acc;
    }, {} as Record<string, { revenue: number; bookings: number }>);

    return Object.entries(revenueByDate).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      bookings: data.bookings,
    }));
  }
}
