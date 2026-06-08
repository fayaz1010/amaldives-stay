
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Wifi,
  Car,
  Coffee,
  Shield,
  Clock,
  Heart,
  Waves,
  Plane,
  Utensils,
  Fish,
  Anchor,
  Ship,
  BedDouble,
  Star,
  Eye,
  Sparkles,
  Bath,
  Wind,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { BookingEngine } from '@/components/booking/booking-engine';

interface NearbyOperator {
  name: string;
  slug: string;
  category: string;
  categoryLabel: string;
  island: string | null;
  rating: number | null;
  reviewCount: number | null;
  photo: string | null;
  url: string;
}
interface GuestHomePageProps {
  tenant: any;
  nearbyOperators?: NearbyOperator[];
  nearbyScoped?: boolean;
}

/** Pick a fitting icon for a free-text highlight/amenity by keyword. */
function iconFor(text: string) {
  const t = text.toLowerCase();
  if (/(beach|sand|shore|beachfront)/.test(t)) return Waves;
  if (/(ocean|sea|lagoon|view)/.test(t)) return Eye;
  if (/(airport|transfer|flight|minute)/.test(t)) return Plane;
  if (/(restaurant|breakfast|cuisine|dining|food|bar)/.test(t)) return Utensils;
  if (/(dive|diving|snorkel)/.test(t)) return Fish;
  if (/(fish|fishing)/.test(t)) return Anchor;
  if (/(sandbank|dolphin|excursion|cruise|trip|boat)/.test(t)) return Ship;
  if (/(room|bed|balcony|bedding|soundproof)/.test(t)) return BedDouble;
  if (/(wifi|wi-fi|internet|reception|24)/.test(t)) return Wifi;
  if (/(review|rated|guest|loved|star)/.test(t)) return Star;
  if (/(bath|shower|towel|robe)/.test(t)) return Bath;
  if (/(air|conditioning|cool)/.test(t)) return Wind;
  return Sparkles;
}

function amenityIcon(name: string) {
  const t = name.toLowerCase();
  if (/wifi|wi-fi/.test(t)) return Wifi;
  if (/air|conditioning/.test(t)) return Wind;
  if (/restaurant|breakfast|coffee|bar|dining/.test(t)) return Utensils;
  if (/beach/.test(t)) return Waves;
  if (/sea|view|garden/.test(t)) return Eye;
  if (/transfer|airport|parking|car/.test(t)) return Plane;
  if (/dive|snorkel/.test(t)) return Fish;
  if (/fish/.test(t)) return Anchor;
  if (/water sport|sport|kayak/.test(t)) return Ship;
  if (/room service|reception|24/.test(t)) return Clock;
  if (/laundry/.test(t)) return Sparkles;
  if (/spa|gym/.test(t)) return Heart;
  if (/secur/.test(t)) return Shield;
  return Check;
}

/* Full-bleed rotating hero. Crossfades between images on a timer with
   manual prev/next + dots. Falls back gracefully when there are 0–1 images. */
function HeroSlider({
  images,
  focal,
  gradient,
}: {
  images: string[];
  focal: string;
  gradient: string;
}) {
  const [current, setCurrent] = useState(0);
  const count = images.length;
  const go = useCallback((i: number) => setCurrent((i + count) % Math.max(count, 1)), [count]);

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {count > 0 ? (
        images.map((src, i) => (
          <div
            key={src + i}
            className="absolute inset-0 bg-cover bg-no-repeat transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: focal,
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'scale(1.05)' : 'scale(1)',
              transition: 'opacity 1000ms ease-in-out, transform 7000ms ease-out',
            }}
          />
        ))
      ) : (
        <div className="absolute inset-0" style={{ backgroundImage: gradient }} />
      )}
      {/* Legibility gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

      {count > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={() => go(current - 1)}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            aria-label="Next photo"
            onClick={() => go(current + 1)}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? 'w-7 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function GuestHomePage({ tenant, nearbyOperators = [], nearbyScoped = false }: GuestHomePageProps) {
  const property = tenant.properties?.[0];
  const rooms = property?.rooms || [];
  const availableRooms = rooms.filter((room: any) => room.status === 'AVAILABLE');

  // Dedupe identical room types so a property with 6 of the same room shows
  // ONE attractive card with an availability count instead of six copies.
  const roomGroups: { room: any; count: number }[] = [];
  for (const r of availableRooms) {
    const key = `${r.name}|${r.type}|${r.basePrice}`;
    const existing = roomGroups.find((g) => `${g.room.name}|${g.room.type}|${g.room.basePrice}` === key);
    if (existing) existing.count += 1;
    else roomGroups.push({ room: r, count: 1 });
  }

  // Branding — defaults match the existing teal/blue palette so untouched
  // tenants look identical. Overridable in /admin/web.
  const theme = (tenant.theme ?? {}) as {
    primaryColor?: string;
    accentColor?: string;
    heroImageUrl?: string;
    heroImages?: string[];
    heroImageFocalPoint?: string;
  };
  const primary = theme.primaryColor || '#0d9488';
  const accent = theme.accentColor || '#2563eb';
  const heroFocal = theme.heroImageFocalPoint || 'center';
  const gallery: string[] = Array.isArray(property?.images) ? property.images.filter(Boolean) : [];

  // Hero slides: explicit heroImages → single hero image → property gallery → gradient.
  const heroSlides: string[] =
    (theme.heroImages && theme.heroImages.filter(Boolean).length > 0
      ? theme.heroImages.filter(Boolean)
      : theme.heroImageUrl
      ? [theme.heroImageUrl]
      : gallery.slice(0, 6));

  // Editorial content from the Web Profile (admin → Web → Profile).
  const webProfile = (property?.settings?.webProfile ?? {}) as {
    tagline?: string;
    highlights?: string[];
    stats?: { value: string; label: string }[];
    imageCredits?: { text: string; url?: string; licenseUrl?: string; licenseLabel?: string }[];
  };
  const imageCredits = Array.isArray(webProfile.imageCredits)
    ? webProfile.imageCredits.filter((c) => c?.text)
    : [];
  const tagline: string | undefined = webProfile.tagline || tenant.description || undefined;
  const highlights: string[] = Array.isArray(webProfile.highlights) ? webProfile.highlights.filter(Boolean) : [];
  const stats = Array.isArray(webProfile.stats) ? webProfile.stats.filter((s) => s?.value) : [];
  const propertyDescription: string = property?.description || '';

  // Amenities — use the owner's real list; fall back to a sensible default set.
  const amenityList: string[] =
    Array.isArray(property?.amenities) && property.amenities.length > 0
      ? property.amenities
      : ['Free WiFi', 'Air Conditioning', 'Restaurant', 'Airport Transfer', '24-hour Reception'];

  // "Experiences & Activities Near Us" — contextual links to amaldives.com.
  const AM = 'https://amaldives.com';
  const island = (property?.city || '').trim();
  const islandSlug = island
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const islandQ = islandSlug ? `&island=${islandSlug}` : '';
  const nearby = [
    { emoji: '🤿', label: 'Dive Centres', cat: 'dive', blurb: `PADI & SSI dive schools and house-reef dives near ${island || 'the island'}` },
    { emoji: '🌊', label: 'Water Sports', cat: 'watersports', blurb: 'Jet ski, parasailing, kayaks & paddleboards' },
    { emoji: '🎣', label: 'Big-Game Fishing', cat: 'fishing', blurb: 'Sunset, night & sport-fishing charters' },
    { emoji: '⛵', label: 'Excursions & Tours', cat: 'excursions', blurb: 'Sandbank, dolphin, manta & snorkel trips' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {tenant.logo && (
                <Image src={tenant.logo} alt={tenant.name} width={40} height={40} className="rounded-lg" />
              )}
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#rooms" className="text-gray-600 transition-colors hover:opacity-80">Rooms</a>
              <a href="#why" className="text-gray-600 transition-colors hover:opacity-80">Why us</a>
              <a href="#gallery" className="text-gray-600 transition-colors hover:opacity-80">Gallery</a>
              <a href="#amenities" className="text-gray-600 transition-colors hover:opacity-80">Amenities</a>
              <a href="#contact" className="text-gray-600 transition-colors hover:opacity-80">Contact</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">Sign In</Button>
              <a href="#rooms">
                <Button size="sm" style={{ backgroundColor: primary, color: 'white' }}>Book Now</Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — rotating slider with beachfront messaging + booking engine */}
      <section className="relative h-[640px] md:h-[680px]">
        <HeroSlider
          images={heroSlides}
          focal={heroFocal}
          gradient={`linear-gradient(to right, ${primary}, ${accent})`}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center text-white max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              {island && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-sm font-medium mb-5 border border-white/25">
                  <Waves className="h-4 w-4" /> Beachfront · {island}, Maldives
                </span>
              )}
              <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-sm">{tenant.name}</h1>
              <p className="text-lg md:text-2xl mb-8 text-gray-50 drop-shadow-sm">
                {tagline || 'Experience comfortable and memorable stays with us'}
              </p>

              <div className="max-w-4xl mx-auto text-left">
                <BookingEngine
                  subdomain={tenant.subdomain}
                  tenantName={tenant.name}
                  primaryColor={primary}
                  source="stay_subdomain"
                  compact
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats / trust bar */}
      {stats.length > 0 && (
        <section className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
              {stats.map((s, i) => (
                <div key={i} className="py-6 text-center px-2">
                  <div className="text-2xl md:text-3xl font-bold" style={{ color: primary }}>{s.value}</div>
                  <div className="text-xs md:text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why stay with us — beachfront-led differentiators */}
      {(highlights.length > 0 || propertyDescription) && (
        <section id="why" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why stay at {tenant.name}?</h2>
              {propertyDescription && (
                <div className="text-lg text-gray-600 max-w-3xl mx-auto space-y-4 text-left md:text-center">
                  {propertyDescription.split('\n\n').map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </motion.div>

            {highlights.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {highlights.map((h, i) => {
                  const Icon = iconFor(h);
                  const featured = i === 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.4) }}
                      className={`rounded-2xl p-6 border flex items-start gap-4 ${
                        featured ? 'sm:col-span-2 lg:col-span-1 text-white border-transparent' : 'bg-white border-gray-100 shadow-sm'
                      }`}
                      style={featured ? { background: `linear-gradient(135deg, ${primary}, ${accent})` } : undefined}
                    >
                      <div
                        className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center"
                        style={featured ? { backgroundColor: 'rgba(255,255,255,0.18)' } : { backgroundColor: `${primary}14` }}
                      >
                        <Icon className="h-6 w-6" style={featured ? { color: 'white' } : { color: primary }} />
                      </div>
                      <p className={`text-[15px] leading-snug font-medium ${featured ? 'text-white' : 'text-gray-700'}`}>{h}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Rooms */}
      <section id="rooms" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Rooms</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Bright, beachfront rooms — many with private balconies and sea views
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {roomGroups.map(({ room, count }, index: number) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden bg-white">
                  <Link href={`/rooms/${room.id}`} className="block aspect-video bg-gray-200 relative group">
                    {room.images?.[0] ? (
                      <Image
                        src={room.images[0]}
                        alt={room.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-100">
                        <BedDouble className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge variant="secondary" className="bg-white/90">{room.type}</Badge>
                    </div>
                    {count > 1 && (
                      <div className="absolute bottom-4 left-4">
                        <Badge className="bg-black/65 text-white border-0">{count} rooms available</Badge>
                      </div>
                    )}
                  </Link>
                  <CardHeader>
                    <CardTitle className="text-xl">
                      <Link href={`/rooms/${room.id}`} className="hover:opacity-80 transition-opacity">{room.name}</Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">{room.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-gray-400" /> {room.capacity}</span>
                        {room.bedType && <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-gray-400" /> {room.bedType}</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: primary }}>{formatCurrency(room.basePrice)}</span>
                        <span className="text-sm text-gray-500">/night</span>
                      </div>
                    </div>

                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {room.amenities.slice(0, 3).map((amenity: string) => (
                            <Badge key={amenity} variant="outline" className="text-xs">{amenity}</Badge>
                          ))}
                          {room.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{room.amenities.length - 3} more</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/rooms/${room.id}`}
                      className="block w-full text-center rounded-md py-2 font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: primary }}
                    >
                      View Room &amp; Book
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo gallery */}
      {gallery.length > 1 && (
        <section id="gallery" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">A look around</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">From the beach to your room — here's what to expect.</p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]">
              {gallery.slice(0, 10).map((src, i) => (
                <div
                  key={src + i}
                  className={`relative overflow-hidden rounded-xl bg-gray-100 group ${
                    i === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${tenant.name} photo ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Amenities */}
      <section id="amenities" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Amenities</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Everything you need for an easy island stay</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {amenityList.map((name, index) => {
              const Icon = amenityIcon(name);
              return (
                <motion.div
                  key={name + index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.4) }}
                  className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3.5 shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}14` }}>
                    <Icon className="h-5 w-5" style={{ color: primary }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{name}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Experiences & Activities Nearby — backlinks to amaldives directory */}
      <section id="experiences" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Experiences &amp; Activities {island ? `Near ${tenant.name}` : 'Nearby'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {island
                ? `Dive centres, water sports, fishing charters and island excursions on ${island}, curated by our friends at amaldives.com.`
                : 'Dive centres, water sports, fishing charters and island excursions, curated by amaldives.com.'}
            </p>
          </div>

          {nearbyScoped && nearbyOperators.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {nearbyOperators.map((op) => (
                <a
                  key={op.slug}
                  href={op.url}
                  target="_blank"
                  rel="noopener"
                  className="group block rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="relative h-40 bg-gray-100">
                    {op.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={op.photo} alt={op.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-3xl">🌊</div>
                    )}
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-800">
                      {op.categoryLabel}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">{op.name}</h3>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      {op.rating != null ? (
                        <span className="font-medium text-amber-600">★ {op.rating} <span className="text-gray-400 font-normal">({op.reviewCount || 0})</span></span>
                      ) : <span className="text-gray-400">{op.island}</span>}
                      <span className="font-medium" style={{ color: primary }}>View →</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {nearby.map((n) => (
              <a
                key={n.cat}
                href={`${AM}/operators?category=${n.cat}${islandQ}`}
                target="_blank"
                rel="noopener"
                className="group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-3">{n.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{n.label}</h3>
                <p className="text-sm text-gray-600 leading-snug">{n.blurb}</p>
                <span className="mt-3 inline-block text-sm font-medium" style={{ color: primary }}>
                  Browse on amaldives →
                </span>
              </a>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {islandSlug && (
              <a href={`${AM}/islands/${islandSlug}`} target="_blank" rel="noopener" className="hover:text-gray-900 underline-offset-2 hover:underline">
                {island} island guide
              </a>
            )}
            <a href={`${AM}/plan-your-trip/maldives-flights-transfers-guide`} target="_blank" rel="noopener" className="hover:text-gray-900 underline-offset-2 hover:underline">
              Getting here &amp; transfers
            </a>
            <a href={`${AM}/plan-your-trip`} target="_blank" rel="noopener" className="hover:text-gray-900 underline-offset-2 hover:underline">
              Plan your Maldives trip
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">We're here to help make your stay perfect</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5" style={{ color: primary }} />
                  <span className="text-gray-600">
                    {[property?.address, property?.city, property?.country].filter(Boolean).join(', ')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5" style={{ color: primary }} />
                  <span className="text-gray-600">{property?.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5" style={{ color: primary }} />
                  <span className="text-gray-600">{property?.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5" style={{ color: primary }} />
                  <span className="text-gray-600">
                    Check-in: {property?.checkInTime} | Check-out: {property?.checkOutTime}
                  </span>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>Have questions? We'd love to hear from you.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <Button type="submit" className="w-full" style={{ backgroundColor: primary, color: 'white' }}>
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">{tenant.name}</h3>
              <p className="text-gray-300 mb-4">{tagline || 'Your comfort is our priority'}</p>
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-teal-400" />
                <span className="text-sm text-gray-300">
                  Powered by{' '}
                  <a href="https://amaldives.com" target="_blank" rel="noopener" className="text-gray-200 hover:text-white underline-offset-2 hover:underline">
                    amaldives
                  </a>{' '}
                  STAY
                </span>
              </div>
            </div>
            <div className="text-right">
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="#rooms" className="block text-gray-300 hover:text-white transition-colors">Rooms</a>
                <a href="#why" className="block text-gray-300 hover:text-white transition-colors">Why us</a>
                <a href="#gallery" className="block text-gray-300 hover:text-white transition-colors">Gallery</a>
                <a href="#contact" className="block text-gray-300 hover:text-white transition-colors">Contact</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm space-y-2">
            <p>&copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
            {imageCredits.length > 0 && (
              <p className="text-xs text-gray-500">
                {imageCredits.map((c, i) => (
                  <span key={i}>
                    {i > 0 && ' · '}
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 underline-offset-2 hover:underline">
                        {c.text}
                      </a>
                    ) : (
                      c.text
                    )}
                    {c.licenseUrl && (
                      <>
                        {' '}
                        <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 underline-offset-2 hover:underline">
                          {c.licenseLabel || 'license'}
                        </a>
                      </>
                    )}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
