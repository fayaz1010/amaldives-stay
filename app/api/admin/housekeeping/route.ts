import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const activePropertyId = await getActivePropertyId(session.user.tenantId);
    const tenantDb = new TenantDb(session.user.tenantId, activePropertyId);
    const tasks = await tenantDb.getHousekeepingTasks({});

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Housekeeping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const data = await request.json();

    const payload: any = {
      roomId: data.roomId,
      taskType: data.taskType,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'PENDING',
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
      notes: data.notes ?? null,
      description: data.description ?? null,
    };

    if (data.assignedTo) payload.assignedTo = data.assignedTo;
    payload.propertyId = await getActivePropertyId(session.user.tenantId);

    const tenantDb = new TenantDb(session.user.tenantId);
    const task = await tenantDb.createHousekeepingTask(payload);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create housekeeping task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
