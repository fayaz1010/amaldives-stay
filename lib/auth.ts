
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'hidden' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Case-insensitive: legacy rows may be stored mixed-case.
        const user = await prisma.user.findFirst({
          where: { email: { equals: credentials.email.trim(), mode: 'insensitive' } },
          include: {
            tenant: true,
            guestProfile: true,
            staffProfile: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        // Check if user is active
        if (!user.isActive) {
          return null;
        }

        // For tenant users, check if tenant is active
        if (user.tenantId) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId },
          });
          
          if (!tenant || tenant.status !== 'ACTIVE') {
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId || undefined,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // On initial signin, capture role + active tenantId.
        token.role = user.role;
        token.tenantId = user.tenantId || undefined;
      }

      // Hydrate memberships into the JWT. Re-fetched every 60s and on
      // explicit session update() calls so the switcher reflects the
      // current tenantId / newly added tenants without re-login.
      const now = Date.now();
      const stale = !token.membershipsRefreshedAt || now - token.membershipsRefreshedAt > 60_000;
      const userId = (user?.id as string | undefined) || (token.sub as string | undefined);
      if (userId && (stale || trigger === 'update')) {
        try {
          const rows = await prisma.tenantMembership.findMany({
            where: { userId },
            include: { tenant: { select: { id: true, name: true, subdomain: true, status: true } } },
          });
          const activeRows = rows.filter((r) => r.tenant.status === 'ACTIVE');
          token.memberships = activeRows.map((r) => ({
            tenantId: r.tenantId,
            tenantName: r.tenant.name,
            subdomain: r.tenant.subdomain,
            role: r.role,
            isDefault: r.isDefault,
          }));
          token.membershipsRefreshedAt = now;
          // If User.tenantId points at a tenant this user no longer has
          // access to, fall back to the default membership.
          const currentValid = token.tenantId && activeRows.some((r) => r.tenantId === token.tenantId);
          if (!currentValid) {
            const fallback = activeRows.find((r) => r.isDefault) ?? activeRows[0];
            token.tenantId = fallback?.tenantId;
          }
        } catch (err) {
          // Don't fail the session over a membership read error — just
          // keep the cached value.
          console.warn('[auth] memberships hydration failed', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.memberships = token.memberships;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  tenantId?: string;
}) {
  const hashedPassword = await hashPassword(data.password);
  
  return await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    include: {
      tenant: true,
      guestProfile: true,
      staffProfile: true,
    },
  });
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      tenant: true,
      guestProfile: true,
      staffProfile: true,
    },
  });
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
    include: {
      tenant: true,
      guestProfile: true,
      staffProfile: true,
    },
  });
}

export async function updateUser(id: string, data: Partial<{
  name: string;
  email: string;
  image: string;
  role: UserRole;
  isActive: boolean;
}>) {
  return await prisma.user.update({
    where: { id },
    data,
    include: {
      tenant: true,
      guestProfile: true,
      staffProfile: true,
    },
  });
}

export async function deleteUser(id: string) {
  return await prisma.user.delete({
    where: { id },
  });
}

// Role-based access control
export function hasRole(user: any, role: string): boolean {
  return user?.role === role;
}

export function hasAnyRole(user: any, roles: string[]): boolean {
  return roles.includes(user?.role);
}

export function isSuperAdmin(user: any): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function isTenantAdmin(user: any): boolean {
  return user?.role === 'TENANT_ADMIN';
}

export function isStaff(user: any): boolean {
  return ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE'].includes(user?.role);
}

export function isGuest(user: any): boolean {
  return user?.role === 'GUEST';
}

export function canAccessTenant(user: any, tenantId: string): boolean {
  if (isSuperAdmin(user)) return true;
  return user?.tenantId === tenantId;
}

export function canManageBookings(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK']);
}

export function canManageRooms(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN', 'MANAGER']);
}

export function canManageStaff(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN', 'MANAGER']);
}

export function canManageHousekeeping(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN', 'MANAGER', 'HOUSEKEEPING']);
}

export function canManageMaintenance(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN', 'MANAGER', 'MAINTENANCE']);
}

export function canViewReports(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN', 'MANAGER']);
}

export function canManageSettings(user: any): boolean {
  return hasAnyRole(user, ['TENANT_ADMIN']);
}

// Permission middleware
export function requireAuth(handler: any) {
  return async (req: any, res: any) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    req.user = session.user;
    return handler(req, res);
  };
}

export function requireRole(roles: string[]) {
  return (handler: any) => {
    return async (req: any, res: any) => {
      const session = await getServerSession(req, res, authOptions);
      
      if (!session || !hasAnyRole(session.user, roles)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      req.user = session.user;
      return handler(req, res);
    };
  };
}

export function requireTenant(handler: any) {
  return async (req: any, res: any) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { tenantId } = req.query;
    
    if (!canAccessTenant(session.user, tenantId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    req.user = session.user;
    req.tenantId = tenantId;
    return handler(req, res);
  };
}
