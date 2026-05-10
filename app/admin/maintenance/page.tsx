import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default async function MaintenancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const requests = await db.getMaintenanceRequests({});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <span className="text-sm text-gray-500">{requests.length} total requests</span>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">No maintenance requests</p>
            <p className="text-sm">Report issues with rooms or facilities to track them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">{r.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{r.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Room {r.room?.number} · Reported by {r.reporter?.name}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
