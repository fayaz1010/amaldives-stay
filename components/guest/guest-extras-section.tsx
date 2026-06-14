'use client';

import { motion } from 'framer-motion';
import { Plane, BedDouble, Clock, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { GuestExtraItem, PropertyGuestPolicies } from '@/lib/guest-extras';

interface GuestExtrasSectionProps {
  extras: GuestExtraItem[];
  policies: PropertyGuestPolicies;
  primaryColor?: string;
}

function categoryIcon(category: string) {
  if (category === 'TRANSFER') return Plane;
  if (/bed|cot/i.test(category)) return BedDouble;
  return Clock;
}

export function GuestExtrasSection({ extras, policies, primaryColor = '#0d9488' }: GuestExtrasSectionProps) {
  if (!extras.length && !policies.specialRequestsPolicy && !policies.airportTransferPickupNotice) {
    return null;
  }

  const transfers = extras.filter((e) => e.category === 'TRANSFER');
  const addOns = extras.filter((e) => e.category === 'ADDON');

  return (
    <section id="extras" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Transfers &amp; Add-ons</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Optional services and extras for your stay. Add requests when you book or contact us directly.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {transfers.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="h-5 w-5" style={{ color: primaryColor }} />
                <h3 className="text-lg font-semibold text-gray-900">Airport Transfer</h3>
              </div>
              <ul className="space-y-3">
                {transfers.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-gray-700">{item.name.replace(/^Airport Transfer — /, '')}</span>
                    <span className="font-semibold text-gray-900 shrink-0">
                      {formatCurrency(item.price)}
                      {item.unit ? <span className="font-normal text-gray-500"> {item.unit}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {policies.airportTransferPickupNotice && (
                <p className="mt-4 text-xs text-gray-500 border-t pt-3">{policies.airportTransferPickupNotice}</p>
              )}
            </div>
          )}

          {addOns.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BedDouble className="h-5 w-5" style={{ color: primaryColor }} />
                <h3 className="text-lg font-semibold text-gray-900">Room Add-ons</h3>
              </div>
              <ul className="space-y-3">
                {addOns.map((item) => {
                  const Icon = categoryIcon(item.name);
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
                      <span className="flex items-center gap-2 text-gray-700">
                        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        {item.name}
                      </span>
                      <span className="font-semibold text-gray-900 shrink-0">
                        {formatCurrency(item.price)}
                        {item.unit ? <span className="font-normal text-gray-500"> {item.unit}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {(policies.specialRequestsPolicy || policies.specialRequestsConfirmationEmail) && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 flex gap-3 text-sm text-amber-900">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              {policies.specialRequestsPolicy ??
                `Special requests are confirmed only after email from ${policies.specialRequestsConfirmationEmail}.`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
