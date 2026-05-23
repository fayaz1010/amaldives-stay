import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateInviteToken } from '@/lib/staff-invite';
import { sendStaffInviteEmail } from '@/lib/send-staff-invite';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        staffProfile: { is: {} },
      },
      include: {
        staffProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const staff = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      staffProfile: u.staffProfile
        ? {
            id: u.staffProfile.id,
            employeeId: u.staffProfile.employeeId,
            department: u.staffProfile.department,
            position: u.staffProfile.position,
            permissions: u.staffProfile.permissions,
            salary: u.staffProfile.salary,
            hireDate: u.staffProfile.hireDate.toISOString(),
            isActive: u.staffProfile.isActive,
            schedule: u.staffProfile.schedule,
          }
        : null,
    }));

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const allowedRoles = ['TENANT_ADMIN', 'MANAGER'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, department, position, employeeId, salary, hireDate, role } = body || {};

    if (!name || !email || !department || !position || !hireDate) {
      return NextResponse.json(
        { error: 'name, email, department, position, hireDate are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const tenantId = session.user.tenantId;
    const finalRole = (role || 'FRONT_DESK') as
      | 'TENANT_ADMIN'
      | 'MANAGER'
      | 'FRONT_DESK'
      | 'HOUSEKEEPING'
      | 'MAINTENANCE';

    // Generate a random temp password. The invite link includes a signed
    // token that lets the staff member set their own password before
    // first sign-in — so this temp value is just a non-empty placeholder
    // that meets the hashed-password schema constraint.
    const tempPassword = crypto.randomBytes(24).toString('base64url');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create User + StaffProfile + TenantMembership in one transaction.
    // The membership row is critical: without it the multi-tenant session
    // hydration in lib/auth.ts won't recognise the staff member's tenant
    // and they'll bounce to /unauthorized after signin.
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: finalRole,
          tenantId,
        },
      });

      const staffProfile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          tenantId,
          department,
          position,
          employeeId: employeeId || null,
          salary: typeof salary === 'number' ? salary : salary ? Number(salary) : null,
          hireDate: new Date(hireDate),
        },
      });

      await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId,
          role: finalRole,
          isDefault: true,
        },
      });

      return { user, staffProfile };
    });

    // Generate a 7-day invite token (signed with NEXTAUTH_SECRET; no DB
    // table required). Staff member uses /auth/invite/[token] to set
    // their own password.
    const inviteToken = generateInviteToken({
      userId: created.user.id,
      email,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    // Build the absolute invite URL using the current request's host so
    // the link works on the tenant's subdomain (e.g.,
    // reef-view-stay.stay.amaldives.com/auth/invite/...).
    const origin = request.headers.get('origin') ?? `https://${request.headers.get('host') ?? 'stay.amaldives.com'}`;
    const inviteUrl = `${origin}/auth/invite/${inviteToken}`;
    const ttlMs = 7 * 24 * 60 * 60 * 1000;

    // Fire-and-await the invite email. If RESEND_API_KEY isn't configured
    // (yet) the helper returns { sent: false } — the admin still sees the
    // invite URL in the response and can share it manually.
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const emailResult = await sendStaffInviteEmail({
      to: email,
      recipientName: name,
      tenantName: tenant?.name ?? 'your team',
      inviterName: session.user.name ?? session.user.email ?? 'A team admin',
      role: finalRole,
      position,
      department,
      inviteUrl,
      ttlMs,
    });

    return NextResponse.json(
      {
        user: {
          id: created.user.id,
          name: created.user.name,
          email: created.user.email,
          role: created.user.role,
          isActive: created.user.isActive,
        },
        staffProfile: {
          ...created.staffProfile,
          hireDate: created.staffProfile.hireDate.toISOString(),
          createdAt: created.staffProfile.createdAt.toISOString(),
          updatedAt: created.staffProfile.updatedAt.toISOString(),
        },
        // Admin shows this to the staff member so they can set their own
        // password. Expires in 7 days. `emailSent` lets the UI decide
        // whether to surface "We've emailed Aisha" vs "Copy this link to
        // your new team member" (when the email send failed or wasn't
        // attempted because the API key isn't configured).
        invite: {
          url: inviteUrl,
          expiresAt: new Date(Date.now() + ttlMs).toISOString(),
          emailSent: emailResult.sent,
          emailReason: emailResult.sent ? null : emailResult.reason,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Staff POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
