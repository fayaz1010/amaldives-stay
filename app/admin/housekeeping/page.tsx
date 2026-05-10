import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

export default async function HousekeepingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const tasks = await db.getHousekeepingTasks({});

  const pending = tasks.filter((t: any) => t.status === 'PENDING');
  const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS');
  const completed = tasks.filter((t: any) => t.status === 'COMPLETED');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
        <div className="flex gap-3 text-sm">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">{pending.length} Pending</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">{inProgress.length} In Progress</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">{completed.length} Completed</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">No housekeeping tasks</p>
            <p className="text-sm">Tasks are created automatically at checkout or can be added manually.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">Room {task.room?.number}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-semibold ${priorityColors[task.priority] || 'text-gray-500'}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{task.taskType?.replace('_', ' ')} — {task.description || 'Standard cleaning'}</p>
                    {task.assignedUser && (
                      <p className="text-xs text-gray-400 mt-1">Assigned to: {task.assignedUser.name}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {task.scheduledDate && new Date(task.scheduledDate).toLocaleDateString()}
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
