
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { GuestHomePage } from '@/components/guest/guest-home-page';
import { WelcomePage } from '@/components/welcome-page';

export default async function HomePage() {
  const headersList = headers();
  const subdomain = headersList.get('X-Tenant-Subdomain');
  
  if (subdomain) {
    // This is a tenant site
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        properties: {
          include: {
            rooms: {
              where: { isActive: true },
              include: {
                bookings: {
                  where: {
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!tenant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <p className="text-gray-600">The requested property could not be found.</p>
          </div>
        </div>
      );
    }
    
    if (tenant.status !== 'ACTIVE') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Property Unavailable</h1>
            <p className="text-gray-600">This property is currently unavailable.</p>
          </div>
        </div>
      );
    }

    // Draft mode — set by /api/admin/seed/apply, cleared by
    // /api/admin/seed/publish. Show a "coming soon" splash so guests who
    // happen onto a draft URL don't see half-finished content.
    const tenantSettings = (tenant.settings as Record<string, unknown> | null) ?? {};
    if (tenantSettings.draftMode === true) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {tenant.name}
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Our booking page is launching soon. Please check back shortly.
            </p>
          </div>
        </div>
      );
    }

    return <GuestHomePage tenant={tenant} />;
  }
  
  // Main platform page
  return <WelcomePage />;
}
