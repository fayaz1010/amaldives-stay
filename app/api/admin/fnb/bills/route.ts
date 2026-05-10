import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['OPEN', 'CLOSED', 'PAID', 'VOIDED'] as const;

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const outletId = url.searchParams.get('outletId');
    const status = url.searchParams.get('status');

    const where: any = { tenantId: session.user.tenantId };
    if (outletId) where.outletId = outletId;
    if (status && VALID_STATUSES.includes(status as any)) where.status = status;

    const bills = await prisma.fnBBill.findMany({
      where,
      include: { outlet: { select: { id: true, name: true, outletType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = bills.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return NextResponse.json({ bills: serialized });
  } catch (error) {
    console.error('FnB Bills GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.outletId) {
      return NextResponse.json({ error: 'outletId is required' }, { status: 400 });
    }

    const outlet = await prisma.fnBOutlet.findFirst({
      where: { id: data.outletId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const { items, subtotal } = normalizeItems(data.items);

    const bill = await prisma.fnBBill.create({
      data: {
        tenantId: session.user.tenantId,
        outletId: data.outletId,
        bookingId: data.bookingId ?? null,
        reservationId: data.reservationId ?? null,
        guestName: data.guestName?.trim() ?? null,
        tableNumber: data.tableNumber?.trim() ?? null,
        items: items as any,
        subtotal,
        discount: 0,
        serviceCharge: 0,
        tax: 0,
        totalAmount: subtotal,
        paidAmount: 0,
        status: 'OPEN',
        notes: data.notes?.trim() ?? null,
      },
      include: { outlet: { select: { id: true, name: true, outletType: true } } },
    });

    return NextResponse.json(
      {
        bill: {
          ...bill,
          createdAt: bill.createdAt.toISOString(),
          updatedAt: bill.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('FnB Bills POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
