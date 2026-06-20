import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { BookingEngine } from '@/components/booking/booking-engine';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headersList = headers();
  const subdomain = headersList.get('X-Tenant-Subdomain');
  const customDomain = headersList.get('X-Tenant-Domain');
  if (!subdomain && !customDomain) notFound();

  const tenant = await prisma.tenant.findFirst({
    where: subdomain ? { subdomain } : { domain: customDomain! },
    include: {
      properties: {
        include: { rooms: { where: { isActive: true } } },
      },
    },
  });
  if (!tenant) notFound();

  const room = tenant.properties.flatMap((p: any) => p.rooms).find((r: any) => r.id === id);
  if (!room) notFound();

  const theme = (tenant.theme ?? {}) as { primaryColor?: string };
  const primary = theme.primaryColor || '#0d9488';
  const images: string[] = Array.isArray(room.images) ? room.images : [];
  const amenities: string[] = Array.isArray(room.amenities) ? room.amenities : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">{tenant.name}</Link>
          <Link href="/#rooms" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> All rooms
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-900">{tenant.name}</Link>
          <span className="mx-2">/</span>
          <Link href="/#rooms" className="hover:text-gray-900">Rooms</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{room.name}</span>
        </nav>

        {/* Gallery */}
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          <div className="md:col-span-2 relative aspect-video rounded-2xl overflow-hidden bg-gray-100">
            {images[0] ? (
              <Image src={images[0]} alt={room.name} fill className="object-cover" priority />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">No image available</div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            {images.slice(1, 3).map((img, i) => (
              <div key={i} className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100">
                <Image src={img} alt={`${room.name} ${i + 2}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          {/* Details */}
          <div>
            <Badge variant="secondary" className="mb-2">{room.type}</Badge>
            <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" /> Sleeps up to {room.capacity} guest{room.capacity === 1 ? '' : 's'}
            </div>
            <p className="mt-5 text-gray-700 leading-relaxed whitespace-pre-line">
              {room.description || 'A comfortable room for your stay.'}
            </p>

            {amenities.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Room amenities</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-gray-700">
                      <Check className="h-4 w-4" style={{ color: primary }} /> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold" style={{ color: primary }}>{formatCurrency(room.basePrice)}</span>
                <span className="text-gray-500">/ night</span>
              </div>
              <BookingEngine
                subdomain={tenant.subdomain}
                tenantName={tenant.name}
                primaryColor={primary}
                source="stay_subdomain"
                compact
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
