import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';

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

    const tenantDb = new TenantDb(session.user.tenantId);
    const requests = await tenantDb.getMaintenanceRequests({});

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Maintenance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const data = await request.json();

    if (!data.title || !data.description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const payload: any = {
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      category: data.category || 'GENERAL',
      reportedBy: session.user.id,
    };

    if (data.roomId) payload.roomId = data.roomId;

    const tenantDb = new TenantDb(session.user.tenantId);
    const requestRecord = await tenantDb.createMaintenanceRequest(payload);

    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error('Create maintenance request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
