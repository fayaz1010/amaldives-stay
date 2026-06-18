import { prisma } from '@/lib/db';
import type { Promotion, Room } from '@prisma/client';

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
  let rackTotal = 0;
  let totalAmount = 0;

  for (let i = 0; i < nights; i++) {
    let night = sellNight;
    if (promo) {
      night = applyPromotion(sellNight, rackNight, promo);
    }
    if (
      input.agentMarkupPercent != null &&
      Number.isFinite(input.agentMarkupPercent)
    ) {
      night = rackNight * (1 + input.agentMarkupPercent / 100);
    }
    nightlyRates.push(night);
    rackTotal += rackNight;
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
  };
}

export function applyAgentMarkupToRack(
  rackTotal: number,
  markupPercent: number,
): number {
  return rackTotal * (1 + markupPercent / 100);
}
