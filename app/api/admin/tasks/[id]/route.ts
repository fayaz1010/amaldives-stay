import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// id format: "staff:xxx" | "hk:xxx" | "maint:xxx" | "svc:xxx" | "logi:xxx"
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const { status } = body;
    const [type, sourceId] = params.id.split(':');

    if (type === 'staff') {
      await prisma.staffTask.update({
        where: { id: sourceId },
        data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
      });
    } else if (type === 'hk') {
      await prisma.housekeepingTask.update({
        where: { id: sourceId },
        data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
      });
    } else if (type === 'maint') {
      await prisma.maintenanceRequest.update({
        where: { id: sourceId },
        data: { status: status === 'COMPLETED' ? 'RESOLVED' : status },
      });
    } else if (type === 'svc') {
      await prisma.serviceOrder.update({
        where: { id: sourceId },
        data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
      });
    } else if (type === 'logi') {
      const logisticsStatus = status === 'COMPLETED' ? 'DELIVERED' : status;
      await prisma.logisticsOrder.update({
        where: { id: sourceId },
        data: { status: logisticsStatus, arrivedAt: logisticsStatus === 'DELIVERED' ? new Date() : null },
      });
    } else {
      return NextResponse.json({ error: 'Unknown task type' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
