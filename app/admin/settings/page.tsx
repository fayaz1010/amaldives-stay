import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: { properties: true },
  });

  if (!tenant) redirect('/auth/signin');

  const property = tenant.properties[0];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Property Name</span>
              <span className="font-medium">{tenant.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Subdomain</span>
              <span className="font-medium text-cyan-700">{tenant.subdomain}.stay.amaldives.com</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Plan</span>
              <span className="capitalize font-medium">{tenant.plan}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Commission Rate</span>
              <span className="font-medium">{(tenant.commissionRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium ${tenant.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                {tenant.status}
              </span>
            </div>
          </CardContent>
        </Card>

        {property && (
          <Card>
            <CardHeader>
              <CardTitle>Contact & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Address</span>
                <span className="font-medium">{property.address}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Island / City</span>
                <span className="font-medium">{property.city}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Atoll / State</span>
                <span className="font-medium">{property.state}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Country</span>
                <span className="font-medium">{property.country}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{property.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{property.email || '—'}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Revenue Model</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>Your account is on the <strong className="text-gray-900 capitalize">{tenant.plan}</strong> plan.</p>
            <p>A <strong className="text-cyan-700">{(tenant.commissionRate * 100).toFixed(0)}% platform fee</strong> is charged on all direct bookings processed through amaldives STAY.</p>
            <p className="text-xs text-gray-400 mt-3">To change your plan or commission rate, contact support@amaldives.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
