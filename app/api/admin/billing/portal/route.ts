import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { tenantUrl } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const stripe = getStripe()!;
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { stripeCustomerId: true, subdomain: true },
  });

  if (!tenant?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const rawOrigin = request.headers.get('origin');
  let origin = tenantUrl(tenant.subdomain);
  if (rawOrigin) {
    try {
      const host = new URL(rawOrigin).hostname;
      const ok =
        host === 'vayves.com' ||
        host.endsWith('.vayves.com') ||
        host === 'stay.amaldives.com' ||
        host.endsWith('.stay.amaldives.com') ||
        host === 'localhost';
      if (ok) origin = rawOrigin.replace(/\/$/, '');
    } catch {
      // keep fallback
    }
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${origin}/admin/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
