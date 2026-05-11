import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const body = await request.json();

    const data: any = {};
    if (body.title !== undefined)       data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.amount !== undefined)      data.amount = parseFloat(body.amount);
    if (body.currency !== undefined)    data.currency = body.currency;
    if (body.category !== undefined)    data.category = body.category;
    if (body.status !== undefined)      data.status = body.status;
    if (body.dueDate !== undefined)     data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined)       data.notes = body.notes;
    if (body.receiptUrl !== undefined)  data.receiptUrl = body.receiptUrl;
    if (body.approvedBy !== undefined)  data.approvedBy = body.approvedBy;
    if (body.status === 'PAID') {
      data.paidAt = new Date();
      data.paidBy = session.user.id ?? null;
    }

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Expense PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
