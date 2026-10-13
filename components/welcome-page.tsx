
'use client';

import { LegalLinks } from '@/components/legal-page';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Hotel,
  Users,
  Calendar,
  CreditCard,
  Settings,
  BarChart3,
  Globe,
  Search,
  MousePointerClick,
  CheckCircle2,
  Wallet,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export function WelcomePage() {
  const features = [
    {
      icon: Hotel,
      title: 'Property Management',
      description: 'Rooms, rates, housekeeping, staff, finance — everything in one dashboard built for Maldivian guesthouses.',
    },
    {
      icon: Calendar,
      title: 'Direct Booking Engine',
      description: 'Book on amaldives.com, your vayves.com page, or one line of code on any website or social bio.',
    },
    {
      icon: Globe,
      title: 'OTA Calendar Sync',
      description: 'Two-way iCal with Booking.com, Airbnb & more — every 5 minutes, with AI guest detail extraction.',
    },
    {
      icon: Users,
      title: 'Guest Experience',
      description: 'Digital check-in, service ordering, and personalized guest communications.',
    },
    {
      icon: CreditCard,
      title: 'Payment Processing',
      description: 'Secure payment gateway integration with multiple payment methods.',
    },
    {
      icon: Settings,
      title: 'Staff Management',
      description: 'Role-based access control, task assignments, and staff scheduling.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Revenue analytics, occupancy tracking, and performance insights.',
    },
  ];

  const plans = [
    {
      name: 'Growth',
      price: '$19',
      period: '/month',
      description: 'For growing guesthouses',
      features: [
        'Try free for 30 days',
        'Channel manager sync',
        'SMS notifications',
        'Advanced analytics',
        'Custom domain',
        'Priority support',
        '10% fee on amaldives.com bookings',
      ],
      badge: 'Most Popular',
    },
    {
      name: 'Business',
      price: '$49',
      period: '/month',
      description: 'For established operators',
      features: [
        'Try free for 30 days',
        'Everything in Growth',
        'Multi-property',
        'White-label',
        'Revenue reports',
        'API access',
        '24/7 phone support',
      ],
      badge: null,
    },
    {
      name: 'Channel Plus',
      price: '$79',
      period: '/month',
      description: 'Maximum automation',
      features: [
        'Try free for 30 days',
        'Everything in Business',
        'Priority channel sync',
        'Stripe direct payouts',
        'Dedicated support',
      ],
      badge: null,
    },
  ];

  const steps = [
    {
      icon: Search,
      title: 'Guests discover you on amaldives.com',
    },
    {
      icon: MousePointerClick,
      title: 'They click Book Direct on your listing',
    },
    {
      icon: CheckCircle2,
      title: 'Booking confirmed — no OTA involved',
    },
    {
      icon: Wallet,
      title: 'You keep 96% · We track & manage the rest',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vayves-logo.svg" alt="Vayves" className="h-9 w-auto" />
            </div>
            <nav className="hidden md:flex space-x-10">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                How it works
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Blog
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900 font-medium">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-block mb-6">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase bg-gray-900 text-white">
                For Independent Hotels &amp; Guesthouses
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-8 tracking-tight">
              Property Management
              <span className="block mt-2 font-normal">Built for Hospitality</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto font-light leading-relaxed">
              Run your hotel, guesthouse, or resort with software that feels as considered as your property. Direct bookings, reservations, operations, and guest experience — unified.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/claim">
                <Button size="lg" className="bg-gray-900 hover:bg-gray-800 text-white px-10 py-6 text-base font-medium h-auto rounded-lg">
                  Start 30-day free trial
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline" className="px-10 py-6 text-base font-medium h-auto rounded-lg border-gray-300 hover:bg-gray-50">
                  View plans
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-8 max-w-xl mx-auto leading-relaxed">
              Already on amaldives.com? Use your listing link — we&apos;ll connect your page automatically.
              Add bookings to Facebook or your website with one copy-paste line.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Designed for the way you work. Built for the way your guests book.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-gray-100 rounded-xl">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-5">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-medium text-gray-900 mb-3">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
              How it works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              From discovery to direct booking, in four simple steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full text-center border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                  <CardHeader className="pb-6">
                    <div className="mx-auto w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-5">
                      <step.icon className="h-7 w-7" />
                    </div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Step {index + 1}
                    </div>
                    <CardTitle className="text-lg font-medium leading-snug">{step.title}</CardTitle>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
              Choose the Perfect Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Try free for 30 days. Start with Growth plan ($19/mo), upgrade or cancel anytime.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className={`h-full relative rounded-xl ${plan.badge ? 'border-gray-900 shadow-xl' : 'border-gray-100'}`}>
                  {plan.badge && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-1">
                      {plan.badge}
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-medium mb-6">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-5xl font-light text-gray-900">{plan.price}</span>
                      <span className="text-gray-500 text-lg">{plan.period}</span>
                    </div>
                    <CardDescription className="mt-4 text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-gray-900 mr-3 shrink-0 mt-0.5" />
                          <span className="text-gray-600 text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.name === 'Growth' ? '/claim' : '/claim'} className="block">
                      <Button
                        className={`w-full ${
                          plan.badge
                            ? 'bg-gray-900 hover:bg-gray-800 text-white'
                            : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                        } py-6 rounded-lg font-medium`}
                      >
                        Start 30-day free trial
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise / integrations */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">Built for local owners</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
              No technical team required. Copy a link, paste one line on your website, or share on WhatsApp — guests book direct while OTAs stay in sync.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'amaldives.com', desc: 'Guests discover you and book direct from your listing.' },
              { title: 'Your stay page', desc: '{name}.vayves.com with full booking & pay.' },
              { title: 'Website embed', desc: 'One script tag — floating Book button on any site.' },
              { title: 'Payments', desc: 'Stripe cards, Maya, BML Connect, or pay at property.' },
            ].map((item) => (
              <Card key={item.title} className="border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-5xl font-light text-white mb-3">934</div>
              <div className="text-gray-400 text-sm uppercase tracking-wide">Guesthouses</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="text-5xl font-light text-white mb-3">1.5K+</div>
              <div className="text-gray-400 text-sm uppercase tracking-wide">Rooms</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-5xl font-light text-white mb-3">10%</div>
              <div className="text-gray-400 text-sm uppercase tracking-wide">amaldives.com fee</div>
              <div className="text-gray-500 text-xs mt-2">4% direct · OTAs 18%+</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="text-5xl font-light text-white mb-3">30 days</div>
              <div className="text-gray-400 text-sm uppercase tracking-wide">Free trial</div>
              <div className="text-gray-500 text-xs mt-2">card required, cancel anytime</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vayves-logo.svg" alt="Vayves" className="h-9 w-auto" />
            </div>
            <p className="text-gray-500 mb-8 text-sm">
              Property management software for independent hotels
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <Link href="/maldives" className="text-gray-600 hover:text-gray-900 transition-colors">
                Maldives Hotels
              </Link>
              <Link href="/for-guesthouses" className="text-gray-600 hover:text-gray-900 transition-colors">
                For Guesthouses
              </Link>
              <Link href="/channel-manager" className="text-gray-600 hover:text-gray-900 transition-colors">
                Channel Manager
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">
                Blog
              </Link>
            </div>
            <LegalLinks className="mt-6 justify-center text-gray-500" />
            <div className="mt-8 text-gray-400 text-sm">
              © 2026 Vayves · by AMaldives
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
