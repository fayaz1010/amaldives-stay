import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

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
    const hashedPassword = await bcrypt.hash('Welcome@2024', 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'FRONT_DESK',
        tenantId,
      },
    });

    const staffProfile = await prisma.staffProfile.create({
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

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
        staffProfile: {
          ...staffProfile,
          hireDate: staffProfile.hireDate.toISOString(),
          createdAt: staffProfile.createdAt.toISOString(),
          updatedAt: staffProfile.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Staff POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
