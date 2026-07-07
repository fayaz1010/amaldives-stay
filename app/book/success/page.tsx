import { headers } from 'next/headers';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PMS_BASE } from '@/lib/domain';

export default function BookSuccessPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const subdomain = headers().get('X-Tenant-Subdomain');
  const ref = searchParams.ref;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 px-4">
      <div className="text-center max-w-md space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p className="text-gray-600">
          Your booking is confirmed
          {ref ? (
            <>
              {' '}
              — reference <span className="font-mono font-semibold">{ref}</span>
            </>
          ) : null}
          .
        </p>
        <Link href={subdomain ? '/' : PMS_BASE}>
          <Button className="bg-cyan-600 hover:bg-cyan-700">Back to property</Button>
        </Link>
      </div>
    </div>
  );
}
