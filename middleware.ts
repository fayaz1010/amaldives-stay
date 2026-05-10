
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  const subdomain = hostname.split('.')[0];
  const isSubdomain = subdomain && subdomain !== 'www' && subdomain !== 'localhost' && !subdomain.includes('localhost');
  
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
    // Protected API routes
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
    
    // Add tenant context to API requests
    if (isSubdomain) {
      const response = NextResponse.next();
      response.headers.set('X-Tenant-Subdomain', subdomain);
      return response;
    }
    
    return NextResponse.next();
  }
  
  // Handle subdomain routing for tenant sites
  if (isSubdomain && !pathname.startsWith('/admin') && !pathname.startsWith('/super-admin')) {
    // This is a tenant site
    const response = NextResponse.next();
    response.headers.set('X-Tenant-Subdomain', subdomain);
    return response;
  }
  
  // Default behavior
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
