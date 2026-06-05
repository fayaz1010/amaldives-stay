
'use client';

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
      description: 'Book on amaldives.com, your stay.amaldives.com page, or one line of code on any website or social bio.',
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
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started',
      features: [
        'Unlimited rooms',
        'Direct booking engine',
        'Guest management',
        'Booking calendar',
        'Mobile dashboard',
        'Listed on amaldives.com',
      ],
      badge: null,
    },
    {
      name: 'Growth',
      price: '$19',
      period: '/month',
      description: 'For growing guesthouses',
      features: [
        'Everything in Free',
        'Channel manager sync',
        'SMS notifications',
        'Advanced analytics',
        'Custom domain',
        'Priority support',
      ],
      badge: 'Most Popular',
    },
    {
      name: 'Business',
      price: '$49',
      period: '/month',
      description: 'For established operators',
      features: [
        'Everything in Growth',
        'Multi-property',
        'White-label',
        'Revenue reports',
        'API access',
        '24/7 phone support',
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/images/logo.png" alt="aMaldives" className="h-10 w-auto" />
              <span className="text-lg font-semibold text-cyan-700">STAY</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-cyan-600 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-cyan-600 transition-colors">
                How it works
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-cyan-600 transition-colors">
                Pricing
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-600">
                  Sign In
                </Button>
              </Link>
              <Link href="/super-admin">
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  Super Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Modern Guest House
              <span className="block text-cyan-600">Management Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The free property management system for Maldives guesthouses. Accept direct bookings from amaldives.com — no OTA commissions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/claim">
                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3">
                  Claim Your Free Account
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline" className="px-8 py-3">
                  View plans
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-6 max-w-xl mx-auto">
              Already on amaldives.com? Use your listing link — we&apos;ll connect your page automatically.
              Add bookings to Facebook or your website with one copy-paste line. Pay with Stripe, Maya, BML, or at check-in.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Property
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform provides all the tools you need to manage your guest house efficiently
              and deliver exceptional guest experiences.
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
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-cyan-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
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
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From discovery to direct booking, in four simple steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="mx-auto w-14 h-14 bg-cyan-600 text-white rounded-full flex items-center justify-center mb-4">
                      <step.icon className="h-7 w-7" />
                    </div>
                    <div className="text-sm font-semibold text-cyan-600 mb-2">
                      Step {index + 1}
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose the Perfect Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Free forever for Maldives guesthouses. Upgrade when you're ready for more.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className={`h-full relative ${plan.badge ? 'border-cyan-500 shadow-lg' : ''}`}>
                  {plan.badge && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-cyan-600">
                      {plan.badge}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-cyan-600 mr-3" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.name === 'Free' ? '/claim' : '/claim'} className="block">
                      <Button
                        className={`w-full mt-6 ${
                          plan.badge
                            ? 'bg-cyan-600 hover:bg-cyan-700'
                            : 'bg-gray-900 hover:bg-gray-800'
                        }`}
                      >
                        {plan.name === 'Free' ? 'Claim free account' : 'Start free, upgrade later'}
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-t">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Built for local owners</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              No technical team required. Copy a link, paste one line on your website, or share on WhatsApp — guests book direct while OTAs stay in sync.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            {[
              { title: 'amaldives.com', desc: 'Guests discover you and book direct from your listing.' },
              { title: 'Your stay page', desc: '{name}.stay.amaldives.com with full booking & pay.' },
              { title: 'Website embed', desc: 'One script tag — floating Book button on any site.' },
              { title: 'Payments', desc: 'Stripe cards, Maya, BML Connect, or pay at property.' },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-cyan-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-4xl font-bold text-white mb-2">934</div>
              <div className="text-cyan-100">Guesthouses</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="text-4xl font-bold text-white mb-2">1.5K+</div>
              <div className="text-cyan-100">Rooms</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-4xl font-bold text-white mb-2">4%</div>
              <div className="text-cyan-100">Platform Fee</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-white mb-2">Free</div>
              <div className="text-cyan-100">Forever</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img src="/images/logo.png" alt="aMaldives" className="h-10 w-auto" />
              <span className="text-lg font-semibold text-cyan-400">STAY</span>
            </div>
            <p className="text-gray-400 mb-6">
              The modern way to manage your guest house operations
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                Contact Us
              </Link>
            </div>
            <div className="mt-8 text-gray-400">
              © 2026 amaldives STAY · by AMaldives
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
