/**
 * Group individual bookable rooms into public "room type" offers
 * (same UX as the property homepage and Booking.com-style selection).
 */

export type RawAvailableRoom = {
  id: string;
  number: string;
  name: string;
  type: string;
  capacity: number;
  basePrice: number;
  rackRate?: number | null;
  description?: string | null;
  amenities?: string[] | null;
  images?: string[] | null;
  bedType?: string | null;
  size?: number | null;
  nights: number;
  totalPrice: number;
  rackTotal?: number | null;
  discountApplied?: number;
};

export type PublicRoomOffer = {
  /** First available room id — used when creating the booking */
  id: string;
  roomIds: string[];
  availableCount: number;
  name: string;
  type: string;
  description: string | null;
  amenities: string[];
  images: string[];
  bedType: string | null;
  capacity: number;
  size: number | null;
  nights: number;
  totalPrice: number;
  pricePerNight: number;
  rackTotal: number | null;
  rackPerNight: number | null;
  discountApplied: number;
};

function offerKey(room: RawAvailableRoom): string {
  return `${room.name}|${room.type}|${room.basePrice}`;
}

export function groupRoomsIntoOffers(rooms: RawAvailableRoom[]): PublicRoomOffer[] {
  const groups = new Map<string, RawAvailableRoom[]>();

  for (const room of rooms) {
    const key = offerKey(room);
    const list = groups.get(key) ?? [];
    list.push(room);
    groups.set(key, list);
  }

  const offers: PublicRoomOffer[] = [];

  for (const list of groups.values()) {
    const rep = list[0];
    const nights = rep.nights;
    const totalPrice = rep.totalPrice;
    const pricePerNight = nights > 0 ? totalPrice / nights : rep.basePrice;
    const rackTotal = rep.rackTotal ?? null;
    const rackPerNight =
      rackTotal != null && nights > 0 ? rackTotal / nights : rep.rackRate ?? null;

    offers.push({
      id: rep.id,
      roomIds: list.map((r) => r.id),
      availableCount: list.length,
      name: rep.name,
      type: rep.type,
      description: rep.description ?? null,
      amenities: rep.amenities ?? [],
      images: rep.images ?? [],
      bedType: rep.bedType ?? null,
      capacity: rep.capacity,
      size: rep.size ?? null,
      nights,
      totalPrice,
      pricePerNight,
      rackTotal,
      rackPerNight,
      discountApplied: rep.discountApplied ?? 0,
    });
  }

  return offers.sort((a, b) => a.totalPrice - b.totalPrice);
}
