'use client';

import Image from 'next/image';
import { Users, BedDouble, Maximize2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { PublicRoomOffer } from '@/lib/public-room-offers';

interface RoomOfferCardProps {
  offer: PublicRoomOffer;
  primaryColor?: string;
  compact?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

export function RoomOfferCard({
  offer,
  primaryColor = '#0d9488',
  compact = false,
  selected = false,
  onSelect,
}: RoomOfferCardProps) {
  const image = offer.images[0];
  const hasDiscount =
    offer.rackTotal != null && offer.rackTotal > offer.totalPrice + 0.01;

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden transition-all ${
        selected
          ? 'border-2 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      style={selected ? { borderColor: primaryColor } : undefined}
    >
      <div className={`flex ${compact ? 'flex-col' : 'flex-col md:flex-row'}`}>
        <div
          className={`relative bg-gray-100 shrink-0 ${
            compact ? 'w-full h-36' : 'w-full md:w-52 h-44 md:h-auto md:min-h-[180px]'
          }`}
        >
          {image ? (
            <Image
              src={image}
              alt={offer.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 200px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <BedDouble className="h-10 w-10" />
            </div>
          )}
          {offer.availableCount > 1 && (
            <span className="absolute bottom-2 left-2 text-xs font-medium bg-black/70 text-white px-2 py-0.5 rounded-md">
              {offer.availableCount} left
            </span>
          )}
        </div>

        <div className={`flex-1 p-4 min-w-0 flex gap-4 ${compact ? 'flex-col' : 'flex-col sm:flex-row sm:items-start'}`}>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                {offer.type.replace(/_/g, ' ')}
              </Badge>
              {selected && (
                <Badge className="text-xs gap-1" style={{ backgroundColor: primaryColor }}>
                  <Check className="h-3 w-3" /> Selected
                </Badge>
              )}
            </div>
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
              {offer.name}
            </h3>
            {offer.description && (
              <p className={`text-gray-600 ${compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
                {offer.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Up to {offer.capacity} guests
              </span>
              {offer.bedType && (
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5" />
                  {offer.bedType}
                </span>
              )}
              {offer.size && (
                <span className="flex items-center gap-1">
                  <Maximize2 className="h-3.5 w-3.5" />
                  {offer.size} m²
                </span>
              )}
            </div>
            {offer.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {offer.amenities.slice(0, compact ? 4 : 6).map((a) => (
                  <span
                    key={a}
                    className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-100"
                  >
                    {a}
                  </span>
                ))}
                {offer.amenities.length > (compact ? 4 : 6) && (
                  <span className="text-xs text-gray-400">
                    +{offer.amenities.length - (compact ? 4 : 6)} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={`shrink-0 flex items-center gap-3 border-t pt-3 ${
            compact
              ? 'w-full justify-between'
              : 'sm:text-right sm:flex-col sm:items-end justify-between sm:justify-start sm:border-t-0 sm:pt-0'
          }`}>
            <div>
              {hasDiscount && (
                <p className="text-xs text-gray-400 line-through">
                  {formatCurrency(offer.rackTotal!)}
                </p>
              )}
              <p className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
                {formatCurrency(offer.totalPrice)}
              </p>
              <p className="text-xs text-gray-500">
                {offer.nights} night{offer.nights !== 1 ? 's' : ''} ·{' '}
                {formatCurrency(offer.pricePerNight)}/night
              </p>
            </div>
            <Button
              type="button"
              size={compact ? 'sm' : 'default'}
              className="min-w-[100px]"
              variant={selected ? 'outline' : 'default'}
              style={
                selected
                  ? { borderColor: primaryColor, color: primaryColor }
                  : { backgroundColor: primaryColor, color: '#fff' }
              }
              onClick={onSelect}
            >
              {selected ? 'Selected' : 'Select'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
