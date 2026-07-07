import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ArrowLeft, Building2 } from 'lucide-react';
import { AddBusinessForm } from './add-business-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Add another business · Vayves' };

export default async function AddBusinessPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');

  const memberships = session.user.memberships ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add another business</h1>
            <p className="text-sm text-gray-600">
              Run a second guesthouse? Add it under the same login.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p>
            Signed in as <strong>{session.user.email}</strong>. The new business
            will be created under this account &mdash; no new password, no new
            email. You can switch between businesses from the sidebar.
          </p>
        </div>

        {memberships.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
              Your current businesses ({memberships.length})
            </p>
            <ul className="text-sm divide-y divide-gray-100">
              {memberships.map((m) => (
                <li key={m.tenantId} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{m.tenantName}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {m.subdomain}.vayves.com · {m.role.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                  {m.isDefault && (
                    <span className="text-[10px] uppercase tracking-wide text-teal-700 font-semibold">
                      default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <AddBusinessForm />
        </div>
      </div>
    </div>
  );
}
