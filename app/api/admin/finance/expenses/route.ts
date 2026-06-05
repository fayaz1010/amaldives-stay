import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const activePropertyId = await getActivePropertyId(tenantId);

    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        ...(activePropertyId ? { propertyId: activePropertyId } : {}),
        ...(category ? { category: category as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const body = await request.json();
    // Attribute the expense to the active property (for separate MIRA filing),
    // unless the caller explicitly provided a propertyId.
    const propertyId = (typeof body.propertyId === 'string' && body.propertyId)
      ? body.propertyId
      : await getActivePropertyId(tenantId);

    const expense = await prisma.expense.create({
      data: {
        tenantId,
        propertyId: propertyId ?? null,
        category: body.category,
        title: body.title,
        description: body.description ?? null,
        amount: parseFloat(body.amount),
        currency: body.currency ?? 'USD',
        status: body.status ?? 'PENDING',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        paidBy: body.paidBy ?? null,
        linkedType: body.linkedType ?? null,
        linkedId: body.linkedId ?? null,
        receiptUrl: body.receiptUrl ?? null,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
