import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const data = await request.json();
    const updates: any = {};

    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'COMPLETED') {
        updates.completedAt = new Date();
      }
    }
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.taskType !== undefined) updates.taskType = data.taskType;
    if (data.scheduledDate !== undefined)
      updates.scheduledDate = new Date(data.scheduledDate);
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.description !== undefined) updates.description = data.description;
    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;

    const tenantDb = new TenantDb(session.user.tenantId);
    const task = await tenantDb.updateHousekeepingTask(params.id, updates);

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Update housekeeping task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
