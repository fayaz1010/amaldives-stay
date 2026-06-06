
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Wifi, 
  Car, 
  Coffee,
  Shield,
  Clock,
  Heart
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

export function GuestHomePage({ tenant, nearbyOperators = [], nearbyScoped = false }: GuestHomePageProps) {
  const property = tenant.properties?.[0];
  const rooms = property?.rooms || [];
  const availableRooms = rooms.filter((room: any) => room.status === 'AVAILABLE');

  // Branding — defaults match the existing teal/blue palette so untouched
  // tenants look identical. Any of these can be overridden in /admin/web.
  const theme = (tenant.theme ?? {}) as {
    primaryColor?: string;
    accentColor?: string;
    heroImageUrl?: string;
    heroImageFocalPoint?: string;
  };
  const primary = theme.primaryColor || '#0d9488'; // teal-600
  const accent = theme.accentColor || '#2563eb';   // blue-600
  const heroImage = theme.heroImageUrl;
  const heroFocal = theme.heroImageFocalPoint || 'center';

  // "Experiences & Activities Near Us" — contextual links to amaldives.com's
  // local-island operator directory + guides. This is intentional: it adds real
  // value for guests AND sends a genuine, topically-relevant backlink from the
  // guesthouse's own domain to amaldives (links are contextual + vary by
  // island/category, so no sitewide-footprint risk). Followed links (no nofollow).
  const AM = 'https://amaldives.com';
  const island = (property?.city || '').trim();
  const islandSlug = island.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const islandQ = islandSlug ? `&island=${islandSlug}` : '';
  const nearby = [
    { emoji: '🤿', label: 'Dive Centres', cat: 'dive', blurb: `PADI & SSI dive schools and house-reef dives near ${island || 'the island'}` },
    { emoji: '🌊', label: 'Water Sports', cat: 'watersports', blurb: 'Jet ski, parasailing, kayaks & paddleboards' },
    { emoji: '🎣', label: 'Big-Game Fishing', cat: 'fishing', blurb: 'Sunset, night & sport-fishing charters' },
    { emoji: '⛵', label: 'Excursions & Tours', cat: 'excursions', blurb: 'Sandbank, dolphin, manta & snorkel trips' },
  ];

  const amenities = [
    { icon: Wifi, name: 'Free Wi-Fi' },
    { icon: Car, name: 'Parking' },
    { icon: Coffee, name: 'Breakfast' },
    { icon: Shield, name: 'Security' },
    { icon: Clock, name: '24/7 Service' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {tenant.logo && (
                <Image
                  src={tenant.logo}
                  alt={tenant.name}
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a
                href="#rooms"
                className="text-gray-600 transition-colors hover:opacity-80"
                style={{ ['--hover' as any]: primary }}
              >
                Rooms
              </a>
              <a
                href="#amenities"
                className="text-gray-600 transition-colors hover:opacity-80"
              >
                Amenities
              </a>
              <a
                href="#experiences"
                className="text-gray-600 transition-colors hover:opacity-80"
              >
                Experiences
              </a>
              <a
                href="#contact"
                className="text-gray-600 transition-colors hover:opacity-80"
              >
                Contact
              </a>
            </nav>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
              <Button size="sm" style={{ backgroundColor: primary, color: 'white' }}>
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section — uses uploaded image if present, otherwise the branded
          gradient. Black overlay keeps text legible over busy photos. */}
      <section
        className="relative h-[600px] bg-cover bg-no-repeat"
        style={
          heroImage
            ? { backgroundImage: `url(${heroImage})`, backgroundPosition: heroFocal }
            : { backgroundImage: `linear-gradient(to right, ${primary}, ${accent})` }
        }
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center text-white max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Welcome to {tenant.name}
              </h1>
              <p className="text-xl mb-8 text-gray-100">
                {tenant.description || 'Experience comfortable and memorable stays with us'}
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

      {/* Rooms Section */}
      <section id="rooms" className="py-20 px-4 sm:px-6 lg:px-8">
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
              Choose from our selection of comfortable and well-appointed rooms
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {availableRooms.map((room: any, index: number) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
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
                        <span className="text-gray-400">No image available</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-white/90">
                        {room.type}
                      </Badge>
                    </div>
                  </Link>
                  <CardHeader>
                    <CardTitle className="text-xl">
                      <Link href={`/rooms/${room.id}`} className="hover:opacity-80 transition-opacity">{room.name}</Link>
                    </CardTitle>
                    <CardDescription>{room.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Up to {room.capacity} guests</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: primary }}>
                          {formatCurrency(room.basePrice)}
                        </span>
                        <span className="text-sm text-gray-500">/night</span>
                      </div>
                    </div>
                    
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {room.amenities.slice(0, 3).map((amenity: string) => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {room.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{room.amenities.length - 3} more
                            </Badge>
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

      {/* Amenities Section */}
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
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Enjoy our comprehensive range of facilities and services
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
            {amenities.map((amenity, index) => (
              <motion.div
                key={amenity.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="text-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primary}1a` /* 10% alpha */ }}
                >
                  <amenity.icon className="h-8 w-8" style={{ color: primary }} />
                </div>
                <h3 className="font-semibold text-gray-900">{amenity.name}</h3>
              </motion.div>
            ))}
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

          {/* Live, island-scoped operators from amaldives (real cards) */}
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

          {/* Category quick-links to the full amaldives directory (scoped to island) */}
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

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're here to help make your stay perfect
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5" style={{ color: primary }} />
                  <span className="text-gray-600">
                    {property?.address}, {property?.city}, {property?.state} {property?.zipCode}
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
                <CardDescription>
                  Have questions? We'd love to hear from you.
                </CardDescription>
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
                  <Button
                    type="submit"
                    className="w-full"
                    style={{ backgroundColor: primary, color: 'white' }}
                  >
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
              <p className="text-gray-300 mb-4">
                {tenant.description || 'Your comfort is our priority'}
              </p>
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
                <a href="#rooms" className="block text-gray-300 hover:text-white transition-colors">
                  Rooms
                </a>
                <a href="#amenities" className="block text-gray-300 hover:text-white transition-colors">
                  Amenities
                </a>
                <a href="#contact" className="block text-gray-300 hover:text-white transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 {tenant.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
