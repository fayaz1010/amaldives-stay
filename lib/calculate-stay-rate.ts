import { prisma } from '@/lib/db';
import type { Promotion, RatePlan, Room } from '@prisma/client';

export interface StayRateInput {
  room: Pick<Room, 'id' | 'basePrice' | 'rackRate' | 'tenantId' | 'propertyId'>;
  checkIn: Date;
  checkOut: Date;
  promotionCode?: string | null;
  agentMarkupPercent?: number | null;
}

export interface StayRateResult {
  nights: number;
  nightlyRates: number[];
  rackTotal: number;
  totalAmount: number;
  discountApplied: number;
  promotionId: string | null;
  agentMarkupPercent: number | null;
  ratePlanIds: string[];
}

// Pick the rate plan covering this night; property-specific plans win over
// tenant-wide (propertyId null) ones. Plans whose minStay exceeds the stay
// length never apply.
export function ratePlanForNight(
  plans: Pick<RatePlan, 'id' | 'propertyId' | 'startDate' | 'endDate' | 'multiplier' | 'minStay'>[],
  night: Date,
  stayNights: number,
  propertyId: string | null,
): (typeof plans)[number] | null {
  let match: (typeof plans)[number] | null = null;
  for (const plan of plans) {
    if (stayNights < (plan.minStay ?? 1)) continue;
    if (night < plan.startDate || night >= plan.endDate) continue;
    if (plan.propertyId && plan.propertyId !== propertyId) continue;
    if (!match || (plan.propertyId && !match.propertyId)) match = plan;
  }
  return match;
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function rackPerNight(room: StayRateInput['room']): number {
  const rack = room.rackRate ?? room.basePrice;
  return rack > 0 ? rack : room.basePrice;
}

export function applyPromotion(
  sell: number,
  rack: number,
  promo: Pick<Promotion, 'discountPercent' | 'appliesTo'>,
): number {
  if (promo.discountPercent <= 0) return sell;
  const anchor = promo.appliesTo === 'RACK' ? rack : sell;
  const discounted = anchor * (1 - promo.discountPercent / 100);
  return Math.min(sell, Math.max(0, discounted));
}

export async function calculateStayRate(input: StayRateInput): Promise<StayRateResult> {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const rackNight = rackPerNight(input.room);
  const sellNight = input.room.basePrice > 0 ? input.room.basePrice : rackNight;

  const ratePlans = await prisma.ratePlan.findMany({
    where: {
      tenantId: input.room.tenantId,
      isActive: true,
      startDate: { lt: input.checkOut },
      endDate: { gt: input.checkIn },
      OR: [{ propertyId: null }, { propertyId: input.room.propertyId }],
    },
  });

  let promo: Promotion | null = null;
  if (input.promotionCode?.trim()) {
    promo = await prisma.promotion.findFirst({
      where: {
        tenantId: input.room.tenantId,
        code: input.promotionCode.trim(),
        isActive: true,
        startDate: { lte: input.checkOut },
        endDate: { gte: input.checkIn },
        OR: [{ propertyId: null }, { propertyId: input.room.propertyId }],
      },
    });
  }

  const nightlyRates: number[] = [];
  const ratePlanIds = new Set<string>();
  let rackTotal = 0;
  let totalAmount = 0;

  for (let i = 0; i < nights; i++) {
    const nightDate = new Date(input.checkIn.getTime() + i * 24 * 60 * 60 * 1000);
    const plan = ratePlanForNight(ratePlans, nightDate, nights, input.room.propertyId);
    const multiplier = plan?.multiplier && plan.multiplier > 0 ? plan.multiplier : 1;
    if (plan) ratePlanIds.add(plan.id);

    const seasonSell = sellNight * multiplier;
    const seasonRack = rackNight * multiplier;
    let night = seasonSell;
    if (promo) {
      night = applyPromotion(seasonSell, seasonRack, promo);
    }
    if (
      input.agentMarkupPercent != null &&
      Number.isFinite(input.agentMarkupPercent)
    ) {
      night = seasonRack * (1 + input.agentMarkupPercent / 100);
    }
    nightlyRates.push(night);
    rackTotal += seasonRack;
    totalAmount += night;
  }

  return {
    nights,
    nightlyRates,
    rackTotal,
    totalAmount,
    discountApplied: Math.max(0, rackTotal - totalAmount),
    promotionId: promo?.id ?? null,
    agentMarkupPercent: input.agentMarkupPercent ?? null,
    ratePlanIds: Array.from(ratePlanIds),
  };
}

export function applyAgentMarkupToRack(
  rackTotal: number,
  markupPercent: number,
): number {
  return rackTotal * (1 + markupPercent / 100);
}
