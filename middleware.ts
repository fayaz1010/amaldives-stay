
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ROOT_DOMAIN, LEGACY_ROOT_DOMAIN } from '@/lib/domain';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const bareHost = hostname.split(':')[0];

  // Migration: permanently redirect the legacy stay.amaldives.com domain (root and
  // every {slug}.stay.amaldives.com tenant subdomain) to the same path on the new
  // Vayves root domain. Keeps live customer links, embeds and SEO intact.
  const isLegacyTenant =
    bareHost.endsWith(`.${LEGACY_ROOT_DOMAIN}`) && bareHost !== LEGACY_ROOT_DOMAIN;
  if (bareHost === LEGACY_ROOT_DOMAIN || isLegacyTenant) {
    const target = request.nextUrl.clone();
    target.protocol = 'https:';
    target.port = '';
    target.host = isLegacyTenant
      ? bareHost.replace(`.${LEGACY_ROOT_DOMAIN}`, `.${ROOT_DOMAIN}`)
      : ROOT_DOMAIN;
    return NextResponse.redirect(target, 301);
  }

  // Only treat as a tenant subdomain when the host is exactly {slug}.{ROOT_DOMAIN}.
  // This prevents Vercel preview URLs (*.vercel.app) and the root domain itself from
  // being incorrectly identified as tenant subdomains.
  const isTenantSubdomain =
    hostname.endsWith(`.${ROOT_DOMAIN}`) && hostname !== ROOT_DOMAIN;
  const subdomain = isTenantSubdomain ? hostname.replace(`.${ROOT_DOMAIN}`, '') : null;

  // A guesthouse's OWN domain pointed at this project. Anything that isn't the
  // platform root, a tenant subdomain, a Vercel preview URL, or localhost is
  // treated as a custom tenant domain — the public site resolves the tenant by
  // matching Tenant.domain to this host (see app/page.tsx).
  const isPlatformHost =
    bareHost === ROOT_DOMAIN ||
    bareHost.endsWith('.vercel.app') ||
    bareHost === 'localhost' ||
    bareHost.startsWith('127.0.0.1');
  const customDomain =
    !isTenantSubdomain && !isPlatformHost && bareHost.includes('.') ? bareHost : null;

  // Get the token to check authentication
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Super admin routes
  if (pathname.startsWith('/super-admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    if (token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    return NextResponse.next();
  }

  // Tenant admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'];
    if (!allowedRoles.includes(token.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    return NextResponse.next();
  }

  // Guest portal routes
  if (pathname.startsWith('/guest')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    return NextResponse.next();
  }

  // API routes protection
  if (pathname.startsWith('/api')) {
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/super-admin')) {
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (pathname.startsWith('/api/super-admin') && token.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (pathname.startsWith('/api/admin')) {
        const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'];
        if (!allowedRoles.includes(token.role as string)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }
    if (subdomain || customDomain) {
      const response = NextResponse.next();
      if (subdomain) response.headers.set('X-Tenant-Subdomain', subdomain);
      if (customDomain) response.headers.set('X-Tenant-Domain', customDomain);
      return response;
    }
    return NextResponse.next();
  }

  // Pass tenant subdomain / custom domain via header for tenant sites
  if (subdomain || customDomain) {
    const response = NextResponse.next();
    if (subdomain) response.headers.set('X-Tenant-Subdomain', subdomain);
    if (customDomain) response.headers.set('X-Tenant-Domain', customDomain);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
