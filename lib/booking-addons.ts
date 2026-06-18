import { prisma } from '@/lib/db';
import { BOOKING_EXTRA_CATEGORIES, inferAddonUnit, type GuestExtraItem } from '@/lib/guest-extras';

export type BookingAddonInput = { serviceId: string; quantity: number };

export type ResolvedAddonLine = {
  serviceId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  unit: string | null;
};

export function calculateAddonLineTotal(
  price: number,
  quantity: number,
  nights: number,
  unit: string | null,
): number {
  if (quantity <= 0) return 0;
  if (unit === 'per night') return price * quantity * nights;
  if (unit === 'per hour') return price * quantity;
  return price * quantity;
}

export function summarizeAddonSelection(
  extras: GuestExtraItem[],
  selection: Record<string, number>,
  nights: number,
): { lines: ResolvedAddonLine[]; addonsTotal: number } {
  const lines: ResolvedAddonLine[] = [];
  let addonsTotal = 0;

  for (const extra of extras) {
    const quantity = selection[extra.id] ?? 0;
    if (quantity <= 0) continue;
    const totalAmount = calculateAddonLineTotal(extra.price, quantity, nights, extra.unit);
    lines.push({
      serviceId: extra.id,
      name: extra.name,
      category: extra.category,
      quantity,
      unitPrice: extra.price,
      totalAmount,
      unit: extra.unit,
    });
    addonsTotal += totalAmount;
  }

  return { lines, addonsTotal };
}

export async function resolveBookingAddons(params: {
  tenantId: string;
  propertyId: string;
  addonItems: BookingAddonInput[];
  nights: number;
}): Promise<{ lines: ResolvedAddonLine[]; addonsTotal: number }> {
  const validItems = params.addonItems
    .map((i) => ({
      serviceId: String(i.serviceId ?? '').trim(),
      quantity: Math.max(0, Math.floor(Number(i.quantity) || 0)),
    }))
    .filter((i) => i.serviceId && i.quantity > 0);

  if (!validItems.length) return { lines: [], addonsTotal: 0 };

  const services = await prisma.service.findMany({
    where: {
      tenantId: params.tenantId,
      isActive: true,
      category: { in: [...BOOKING_EXTRA_CATEGORIES] },
      OR: [{ propertyId: null }, { propertyId: params.propertyId }],
      id: { in: validItems.map((i) => i.serviceId) },
    },
    select: { id: true, name: true, category: true, price: true, description: true },
  });

  const byId = new Map(services.map((s) => [s.id, s]));
  const lines: ResolvedAddonLine[] = [];
  let addonsTotal = 0;

  for (const item of validItems) {
    const service = byId.get(item.serviceId);
    if (!service) throw new Error(`Add-on not available: ${item.serviceId}`);
    const unit = inferAddonUnit(service.name, service.description);
    const totalAmount = calculateAddonLineTotal(
      service.price,
      item.quantity,
      params.nights,
      unit,
    );
    lines.push({
      serviceId: service.id,
      name: service.name,
      category: service.category,
      quantity: item.quantity,
      unitPrice: service.price,
      totalAmount,
      unit,
    });
    addonsTotal += totalAmount;
  }

  return { lines, addonsTotal };
}

export async function createBookingAddonOrders(params: {
  tenantId: string;
  propertyId: string;
  bookingId: string;
  roomId: string;
  guestId: string;
  lines: ResolvedAddonLine[];
  status: 'PENDING' | 'CONFIRMED';
  notes?: string | null;
}) {
  if (!params.lines.length) return [];

  return Promise.all(
    params.lines.map((line) =>
      prisma.serviceOrder.create({
        data: {
          tenantId: params.tenantId,
          propertyId: params.propertyId,
          bookingId: params.bookingId,
          roomId: params.roomId,
          guestId: params.guestId,
          serviceId: line.serviceId,
          quantity: line.quantity,
          totalAmount: line.totalAmount,
          status: params.status,
          scheduledDate: new Date(),
          notes: params.notes ?? null,
        },
      }),
    ),
  );
}
