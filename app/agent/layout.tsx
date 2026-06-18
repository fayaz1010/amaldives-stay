import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getAgentContext } from '@/lib/agent-context';

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const ctx = await getAgentContext(session);
  if (!ctx) redirect('/auth/signin');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3">
        <p className="text-sm font-semibold text-teal-700">amaldives STAY · Agent portal</p>
      </header>
      {children}
    </div>
  );
}
