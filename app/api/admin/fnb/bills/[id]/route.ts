import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['OPEN', 'CLOSED', 'PAID', 'VOIDED'] as const;
const VALID_PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CRYPTO'] as const;

function normalizeItems(rawItems: any): { items: Array<{ name: string; qty: number; unitPrice: number; totalPrice: number }>; subtotal: number } {
  if (!Array.isArray(rawItems)) return { items: [], subtotal: 0 };
  let subtotal = 0;
  const items = rawItems
    .filter((it) => it && typeof it === 'object' && it.name)
    .map((it) => {
      const qty = Math.max(0, Number(it.qty ?? it.quantity ?? 1));
      const unitPrice = Math.max(0, Number(it.unitPrice ?? it.price ?? 0));
      const totalPrice = Number((qty * unitPrice).toFixed(2));
      subtotal += totalPrice;
      return {
        name: String(it.name).trim(),
        qty,
        unitPrice,
        totalPrice,
      };
    });
  return { items, subtotal: Number(subtotal.toFixed(2)) };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bill = await prisma.fnBBill.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: { outlet: { select: { id: true, name: true, outletType: true, location: true } } },
    });
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({
      bill: {
        ...bill,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('FnB Bill GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.fnBBill.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: any = {};

    if (data.guestName !== undefined) updates.guestName = data.guestName?.trim() ?? null;
    if (data.tableNumber !== undefined) updates.tableNumber = data.tableNumber?.trim() ?? null;
    if (data.notes !== undefined) updates.notes = data.notes?.trim() ?? null;

    let subtotal = existing.subtotal;
    let totalsChanged = false;

    if (data.items !== undefined) {
      const norm = normalizeItems(data.items);
      updates.items = norm.items as any;
      subtotal = norm.subtotal;
      updates.subtotal = subtotal;
      totalsChanged = true;
    }

    const discount = data.discount !== undefined ? Math.max(0, Number(data.discount)) : existing.discount;
    const serviceCharge = data.serviceCharge !== undefined ? Math.max(0, Number(data.serviceCharge)) : existing.serviceCharge;
    const tax = data.tax !== undefined ? Math.max(0, Number(data.tax)) : existing.tax;

    if (data.discount !== undefined) {
      updates.discount = discount;
      totalsChanged = true;
    }
    if (data.serviceCharge !== undefined) {
      updates.serviceCharge = serviceCharge;
      totalsChanged = true;
    }
    if (data.tax !== undefined) {
      updates.tax = tax;
      totalsChanged = true;
    }

    let totalAmount = existing.totalAmount;
    if (totalsChanged) {
      totalAmount = Number((subtotal - discount + serviceCharge + tax).toFixed(2));
      updates.totalAmount = totalAmount;
    }

    let paidAmount = existing.paidAmount;
    if (data.paidAmount !== undefined) {
      paidAmount = Math.max(0, Number(data.paidAmount));
      updates.paidAmount = paidAmount;
    }

    if (data.paymentMethod !== undefined) {
      if (data.paymentMethod === null) {
        updates.paymentMethod = null;
      } else if (VALID_PAYMENT_METHODS.includes(data.paymentMethod)) {
        updates.paymentMethod = data.paymentMethod;
      }
    }

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = data.status;
    }

    const currentStatus = updates.status ?? existing.status;
    if (paidAmount >= totalAmount && totalAmount > 0 && currentStatus !== 'PAID' && currentStatus !== 'VOIDED') {
      updates.status = 'PAID';
    }

    const bill = await prisma.fnBBill.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
      include: { outlet: { select: { id: true, name: true, outletType: true, location: true } } },
    });

    return NextResponse.json({
      bill: {
        ...bill,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('FnB Bill PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
