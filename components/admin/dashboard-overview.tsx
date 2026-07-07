'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Hotel,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  PlaneLanding,
  Anchor,
  CheckSquare,
  CreditCard,
  ArrowRight,
  Bed,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OnboardingWizard } from '@/components/admin/onboarding-wizard';
import { QuickSetupCard } from '@/components/admin/quick-setup-card';
import { DraftBanner } from '@/components/admin/draft-banner';

interface DashboardOverviewProps {
  stats: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    cleaningRooms: number;
    maintenanceRooms: number;
    todayCheckIns: number;
    todayCheckOuts: number;
    pendingTasksCount: number;
    openReceivables: number;
    totalRevenue: number;
    monthlyRevenue: number;
    occupancyRate: number;
    averageDailyRate: number;
    revPAR: number;
  };
  recentBookings: any[];
  housekeepingTasks: any[];
  pendingTasks: any[];
  user: any;
  showOnboarding?: boolean;
  showQuickSetup?: boolean;
  draftMode?: boolean;
  propertySubdomain?: string;
  propertyName?: string;
  propertyId?: string;
  stripePlatformConfigured?: boolean;
  tenantSettings?: unknown;
  otaIngestDomain?: string | null;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  sub,
  href,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className={`rounded-xl border ${bg} p-4 flex items-start justify-between hover:shadow-md transition-shadow`}>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg ${bg} border`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RoomStatusBar({
  available, occupied, cleaning, maintenance, total,
}: {
  available: number; occupied: number; cleaning: number; maintenance: number; total: number;
}) {
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          <Hotel className="h-4 w-4 text-teal-600" /> Room Status
        </h3>
        <span className="text-xs text-gray-400">{total} total</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
        {available > 0 && <div className="bg-teal-400 transition-all" style={{ width: pct(available) }} title={`Available: ${available}`} />}
        {occupied > 0 && <div className="bg-blue-500 transition-all" style={{ width: pct(occupied) }} title={`Occupied: ${occupied}`} />}
        {cleaning > 0 && <div className="bg-yellow-400 transition-all" style={{ width: pct(cleaning) }} title={`Cleaning: ${cleaning}`} />}
        {maintenance > 0 && <div className="bg-red-400 transition-all" style={{ width: pct(maintenance) }} title={`Maintenance: ${maintenance}`} />}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Available', count: available, color: 'text-teal-600' },
          { label: 'Occupied', count: occupied, color: 'text-blue-600' },
          { label: 'Cleaning', count: cleaning, color: 'text-yellow-600' },
          { label: 'Maintenance', count: maintenance, color: 'text-red-600' },
        ].map(({ label, count, color }) => (
          <div key={label}>
            <p className={`text-lg font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardOverview({
  stats,
  recentBookings,
  housekeepingTasks,
  pendingTasks,
  user,
  showOnboarding = false,
  showQuickSetup = false,
  draftMode = false,
  propertySubdomain = '',
  propertyName = '',
  propertyId = '',
  stripePlatformConfigured = false,
  tenantSettings,
  otaIngestDomain = null,
}: DashboardOverviewProps) {
  // The quick-setup card is shown first when the property is empty. If the
  // owner skips it, we fall back to the manual wizard. The wizard is also
  // explicitly invoked from the quick-setup card's "Manual setup" button.
  const [showWizard, setShowWizard] = useState(showOnboarding && !showQuickSetup);
  const [showSetup, setShowSetup] = useState(showQuickSetup);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const actionItems = [
    stats.todayCheckIns > 0 && {
      icon: PlaneLanding,
      color: 'text-green-600',
      bg: 'bg-green-50',
      text: `${stats.todayCheckIns} arrival${stats.todayCheckIns > 1 ? 's' : ''} today`,
      href: '/admin/arrivals',
    },
    stats.todayCheckOuts > 0 && {
      icon: Anchor,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      text: `${stats.todayCheckOuts} departure${stats.todayCheckOuts > 1 ? 's' : ''} today`,
      href: '/admin/arrivals',
    },
    stats.pendingTasksCount > 0 && {
      icon: CheckSquare,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      text: `${stats.pendingTasksCount} open task${stats.pendingTasksCount > 1 ? 's' : ''}`,
      href: '/admin/tasks',
    },
    stats.openReceivables > 0 && {
      icon: CreditCard,
      color: 'text-red-600',
      bg: 'bg-red-50',
      text: `${formatCurrency(stats.openReceivables)} outstanding`,
      href: '/admin/finance',
    },
  ].filter(Boolean) as { icon: any; color: string; bg: string; text: string; href: string }[];

  return (
    <div className="space-y-5">
      {/* Draft-mode banner — shown after a quick-setup seed but before
          the owner clicks Publish on their freshly imported page. */}
      {draftMode && <DraftBanner />}

      {/* One-click setup — Hotellook search + auto-seed. Fallback button
          opens the manual wizard. */}
      {showSetup && (
        <QuickSetupCard
          defaultName={propertyName}
          onManualSetup={() => {
            setShowSetup(false);
            setShowWizard(true);
          }}
          onSeeded={() => setShowSetup(false)}
        />
      )}

      {showWizard && (
        <OnboardingWizard
          propertyName={propertyName}
          subdomain={propertySubdomain}
          propertyId={propertyId}
          stripePlatformConfigured={stripePlatformConfigured}
          tenantSettings={tenantSettings}
          otaIngestDomain={otaIngestDomain}
          onComplete={() => setShowWizard(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Good morning, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{user?.role?.replace('_', ' ')}</Badge>
      </div>

      {/* Action strip */}
      {actionItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actionItems.map((item) => (
            <Link key={item.href + item.text} href={item.href} className="shrink-0">
              <div className={`flex items-center gap-2 ${item.bg} rounded-lg px-3 py-2 text-sm font-medium ${item.color} border hover:shadow-sm transition-shadow whitespace-nowrap`}>
                <item.icon className="h-4 w-4" />
                {item.text}
                <ArrowRight className="h-3.5 w-3.5 opacity-60" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Rooms" value={stats.totalRooms} icon={Hotel} color="text-gray-600" bg="bg-gray-50" />
        <StatCard title="Occupied" value={stats.occupiedRooms} icon={Bed} color="text-blue-600" bg="bg-blue-50"
          sub={`${stats.occupancyRate}% occupancy`} />
        <StatCard title="Today Arrivals" value={stats.todayCheckIns} icon={PlaneLanding} color="text-green-600" bg="bg-green-50"
          href="/admin/arrivals" />
        <StatCard title="Today Departures" value={stats.todayCheckOuts} icon={Anchor} color="text-teal-600" bg="bg-teal-50"
          href="/admin/arrivals" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Monthly Revenue</p>
          <p className="text-xl font-bold text-teal-700">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Occupancy Rate</p>
          <p className="text-xl font-bold text-blue-700">{stats.occupancyRate}%</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Avg Daily Rate</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.averageDailyRate)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">RevPAR</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.revPAR)}</p>
        </div>
      </div>

      {/* Room status bar */}
      <RoomStatusBar
        available={stats.availableRooms}
        occupied={stats.occupiedRooms}
        cleaning={stats.cleaningRooms}
        maintenance={stats.maintenanceRooms}
        total={stats.totalRooms}
      />

      {/* 3-column live data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent bookings */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" /> Recent Bookings
            </h3>
            <Link href="/admin/reservations">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-teal-600">View all</Button>
            </Link>
          </div>
          <div className="divide-y">
            {recentBookings?.length > 0 ? recentBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.guest?.name || 'Guest'}</p>
                  <p className="text-xs text-gray-400">Rm {b.room?.number} · {formatDate(b.checkInDate)}</p>
                </div>
                <div className="text-right">
                  <Badge className={`text-xs ${getStatusColor(b.status)}`}>{b.status}</Badge>
                  <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(b.totalAmount)}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p>
            )}
          </div>
        </div>

        {/* Pending tasks */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-orange-500" /> Open Tasks
            </h3>
            <Link href="/admin/tasks">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-teal-600">View all</Button>
            </Link>
          </div>
          <div className="divide-y">
            {pendingTasks?.length > 0 ? pendingTasks.map((t) => (
              <div key={t.id} className="flex items-start justify-between px-4 py-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{t.category?.toLowerCase().replace('_', ' ')}</p>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${
                  t.priority === 'HIGH' || t.priority === 'URGENT' ? 'border-red-300 text-red-600' : 'border-gray-200 text-gray-500'
                }`}>{t.priority}</Badge>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">No open tasks</p>
            )}
          </div>
        </div>

        {/* Housekeeping */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" /> Housekeeping
            </h3>
            <Link href="/admin/housekeeping">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-teal-600">View all</Button>
            </Link>
          </div>
          <div className="divide-y">
            {housekeepingTasks?.length > 0 ? housekeepingTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {t.status === 'COMPLETED' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : t.status === 'IN_PROGRESS' ? (
                    <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.taskType} · Rm {t.room?.number}</p>
                    <p className="text-xs text-gray-400">{t.assignedUser?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <Badge className={`text-xs ${getStatusColor(t.status)}`}>{t.status}</Badge>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">No pending tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
