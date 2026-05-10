import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    const where: any = { tenantId, isActive: true };
    if (department) where.department = department;

    const sops = await prisma.staffSOP.findMany({
      where,
      orderBy: [{ department: 'asc' }, { title: 'asc' }],
    });

    const serialized = sops.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ sops: serialized });
  } catch (error) {
    console.error('SOP GET error:', error);
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

    const tenantId = session.user.tenantId;
    const body = await request.json();
    const { department, title, description, steps } = body || {};

    if (!department || !title) {
      return NextResponse.json(
        { error: 'department and title are required' },
        { status: 400 }
      );
    }

    const created = await prisma.staffSOP.create({
      data: {
        tenantId,
        department,
        title,
        description: description || null,
        steps: Array.isArray(steps) ? steps : [],
      },
    });

    return NextResponse.json(
      {
        sop: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('SOP POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
