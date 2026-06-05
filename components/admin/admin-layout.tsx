'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Hotel,
  Users,
  ClipboardList,
  Wrench,
  UtensilsCrossed,
  BookOpen,
  PlaneLanding,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Beer,
  Compass,
  UserCheck,
  Package,
  Utensils,
  CheckSquare,
  CheckSquare2,
  DollarSign,
  Globe,
  ChevronDown,
  ChevronRight,
  Layers,
  Wifi,
  Home,
  Tag,
  MousePointerClick,
  CreditCard,
  Banknote,
  Receipt,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TenantSwitcher } from '@/components/admin/tenant-switcher';
import { PropertySwitcher } from '@/components/admin/property-switcher';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  indent?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
  planRequired?: string; // plan tier required to see (undefined = always visible)
}

interface AdminLayoutProps {
  children: React.ReactNode;
  user: any;
  tenantPlan?: string;
  tenantSubdomain?: string;
  // Branding — used to render the sidebar header. All optional; defaults
  // preserve the platform-wide look.
  tenantName?: string;
  tenantLogo?: string | null;
  primaryColor?: string | null;
  /** Memberships passed through to the sidebar tenant switcher. */
  memberships?: Array<{
    tenantId: string;
    tenantName: string;
    subdomain: string;
    role: string;
    isDefault: boolean;
  }>;
  /** Active tenant id (drives which membership the switcher highlights). */
  activeTenantId?: string;
  /** Properties for the active tenant (drives the property switcher). */
  properties?: Array<{ id: string; name: string }>;
  /** Active property id within the tenant. */
  activePropertyId?: string | null;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Tasks', href: '/admin/tasks', icon: CheckSquare },
      { name: 'Finance', href: '/admin/finance', icon: DollarSign },
      { name: 'MIRA / Tax', href: '/admin/finance/mira', icon: Receipt },
      { name: 'Properties', href: '/admin/properties', icon: MapPin },
      { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'reservations',
    label: 'Reservations',
    icon: Calendar,
    items: [
      { name: 'Reservations', href: '/admin/reservations', icon: Calendar },
      { name: 'Availability', href: '/admin/availability', icon: CalendarDays },
      { name: 'Arrivals & Departures', href: '/admin/arrivals', icon: PlaneLanding },
    ],
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: Hotel,
    items: [
      { name: 'Rooms', href: '/admin/rooms', icon: Hotel },
      { name: 'Pricing & Rates', href: '/admin/pricing', icon: Tag },
      { name: 'Housekeeping', href: '/admin/housekeeping', icon: ClipboardList },
      { name: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
    ],
  },
  {
    id: 'guest-services',
    label: 'Guest Services',
    icon: UtensilsCrossed,
    items: [
      { name: 'Room Service', href: '/admin/room-service', icon: UtensilsCrossed },
      { name: 'Service Menu', href: '/admin/room-service/menu', icon: BookOpen, indent: true },
      { name: 'Mini Bar', href: '/admin/minibar', icon: Beer },
      { name: 'Extra Services', href: '/admin/extra-services', icon: Compass },
      { name: 'F&B', href: '/admin/fnb', icon: Utensils },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Layers,
    items: [
      { name: 'Guests', href: '/admin/guests', icon: Users },
      { name: 'Staff', href: '/admin/staff', icon: UserCheck },
      { name: 'Logistics', href: '/admin/logistics', icon: Package },
    ],
  },
  {
    id: 'web',
    label: 'Web & Distribution',
    icon: Globe,
    planRequired: 'web',
    items: [
      { name: 'amaldives Page', href: '/admin/web', icon: Globe },
      { name: 'Channel Manager', href: '/admin/web?tab=channels', icon: Wifi },
      { name: 'Website embed', href: '/admin/embed', icon: MousePointerClick },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { name: 'Settings', href: '/admin/settings', icon: Settings },
      { name: 'Payments', href: '/admin/settings/payments', icon: Banknote },
      { name: 'Billing', href: '/admin/settings/billing', icon: CreditCard },
    ],
  },
];

function SidebarContent({
  pathname,
  tenantPlan,
  tenantName,
  tenantLogo,
  primaryColor,
  memberships,
  activeTenantId,
  properties,
  activePropertyId,
  onClose,
  onNavClick,
}: {
  pathname: string;
  tenantPlan: string;
  tenantName?: string;
  tenantLogo?: string | null;
  primaryColor?: string | null;
  memberships?: AdminLayoutProps['memberships'];
  activeTenantId?: string;
  properties?: Array<{ id: string; name: string }>;
  activePropertyId?: string | null;
  onClose?: () => void;
  onNavClick?: () => void;
}) {
  // Determine which group is active based on current path
  const activeGroupId = useMemo(() => {
    for (const group of NAV_GROUPS) {
      if (group.items.some((item) => {
        if (item.href === '/admin') return pathname === '/admin';
        return pathname.startsWith(item.href);
      })) {
        return group.id;
      }
    }
    return 'overview';
  }, [pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([activeGroupId]));

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isItemActive(item: NavItem) {
    if (item.href === '/admin') return pathname === '/admin';
    return pathname.startsWith(item.href.split('?')[0]);
  }

  const visibleGroups = NAV_GROUPS.filter((g) => {
    if (!g.planRequired) return true;
    // Always show Web group but gate content inside
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Tenant switcher — renders a plain label when the user belongs to
          one tenant, or a dropdown with all their accounts + "Add another
          business" when they belong to more than one. */}
      <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
        {memberships && memberships.length > 0 && activeTenantId ? (
          <TenantSwitcher
            activeTenantId={activeTenantId}
            memberships={memberships}
            activeLogo={tenantLogo}
            accentColor={primaryColor ?? undefined}
          />
        ) : (
          // Fallback for sessions where memberships haven't loaded yet
          // (first render after a fresh signin, before the JWT hydrates).
          <div className="flex items-center gap-2 min-w-0">
            {tenantLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenantLogo}
                alt={tenantName || 'Property logo'}
                className="w-7 h-7 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryColor || '#0d9488' }}
              >
                <Hotel className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-bold text-gray-900 text-sm truncate">
              {tenantName || 'amaldives STAY'}
            </span>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Property switcher — only renders for multi-property tenants. Picks
          which property within the current business you're operating on. */}
      {properties && properties.length > 1 && (
        <div className="px-3 py-2 border-b shrink-0 bg-gray-50/60">
          <PropertySwitcher activePropertyId={activePropertyId ?? null} properties={properties} />
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visibleGroups.map((group) => {
          const isOpen = openGroups.has(group.id);
          const isLocked = group.planRequired && tenantPlan === 'basic';
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors',
                  isOpen ? 'text-teal-700 bg-teal-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                )}
              >
                <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isLocked && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">PRO</span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              {/* Group items */}
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isItemActive(item);
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={isLocked ? '/admin/web' : item.href}
                        onClick={() => { onNavClick?.(); onClose?.(); }}
                        className={cn(
                          'flex items-center gap-2.5 py-2 rounded-lg text-sm transition-colors',
                          item.indent ? 'pl-8 pr-3' : 'pl-5 pr-3',
                          active
                            ? 'bg-teal-50 text-teal-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        <ItemIcon className={cn('h-4 w-4 shrink-0', active ? 'text-teal-600' : 'text-gray-400')} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export function AdminLayout({
  children,
  user,
  tenantPlan = 'basic',
  tenantSubdomain = '',
  tenantName,
  tenantLogo,
  primaryColor,
  memberships,
  activeTenantId,
  properties,
  activePropertyId,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const pathname = usePathname();

  // Clear navigation indicator when route settles
  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  const handleNavClick = useCallback(() => {
    setNavigating(true);
    setSidebarOpen(false);
  }, []);

  const currentPageName = useMemo(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.href === '/admin' && pathname === '/admin') return 'Dashboard';
        if (item.href !== '/admin' && pathname.startsWith(item.href.split('?')[0])) return item.name;
      }
    }
    return 'Dashboard';
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-60 bg-white shadow-xl">
            <SidebarContent
              pathname={pathname}
              tenantPlan={tenantPlan}
              tenantName={tenantName}
              tenantLogo={tenantLogo}
              primaryColor={primaryColor}
              memberships={memberships}
              activeTenantId={activeTenantId}
              properties={properties}
              activePropertyId={activePropertyId}
              onNavClick={handleNavClick}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-56 lg:flex-col border-r border-gray-200 bg-white">
        <SidebarContent
          pathname={pathname}
          tenantPlan={tenantPlan}
          tenantName={tenantName}
          tenantLogo={tenantLogo}
          primaryColor={primaryColor}
          memberships={memberships}
          activeTenantId={activeTenantId}
          properties={properties}
          activePropertyId={activePropertyId}
          onNavClick={handleNavClick}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-56">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-12 bg-white border-b border-gray-200 items-center px-4 gap-3">
          {/* Navigation progress bar */}
          {navigating && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-teal-100 overflow-hidden z-50">
              <div className="h-full w-1/3 bg-teal-500 animate-progress rounded-full" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <span className="text-sm font-semibold text-gray-800 flex-1">{currentPageName}</span>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              {user?.name}
              <Badge variant="secondary" className="text-xs capitalize">
                {user?.role?.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-red-600"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 flex md:hidden">
        {[
          { name: 'Home', href: '/admin', icon: Home },
          { name: 'Calendar', href: '/admin/availability', icon: Calendar },
          { name: 'Reservations', href: '/admin/reservations', icon: ClipboardList },
          { name: 'Tasks', href: '/admin/tasks', icon: CheckSquare2 },
          { name: 'Settings', href: '/admin/settings', icon: Settings },
        ].map((item) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-teal-600' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <ItemIcon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
