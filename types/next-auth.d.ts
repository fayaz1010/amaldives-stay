
import NextAuth, { DefaultSession } from "next-auth"

/**
 * Lightweight membership shape attached to every session so the admin
 * header can render the tenant switcher without an extra round-trip.
 * Full membership data (createdAt, etc.) still lives in TenantMembership.
 */
export interface SessionMembership {
  tenantId: string
  tenantName: string
  subdomain: string
  role: string
  isDefault: boolean
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      tenantId?: string
      /** Tenants this user can access. Always at least one row when tenantId is set. */
      memberships?: SessionMembership[]
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    tenantId?: string | undefined
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    tenantId?: string | undefined
    memberships?: SessionMembership[]
    /** Epoch ms when memberships were last loaded — refreshed every 60s. */
    membershipsRefreshedAt?: number
  }
}
