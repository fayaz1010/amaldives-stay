/**
 * POST /api/auth/accept-invite
 *
 * Consume a staff-invite token: validate the signature, set the user's
 * password to one they choose, and return success. The client then signs
 * the user in via the standard credentials provider.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyInviteToken } from '@/lib/staff-invite';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  const verdict = verifyInviteToken(token);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error:
          verdict.reason === 'expired'
            ? 'This invite has expired. Ask your admin for a fresh link.'
            : 'Invite link is invalid.',
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: verdict.payload.userId } });
  if (!user || user.email !== verdict.payload.email || !user.isActive) {
    return NextResponse.json({ error: 'Account not available' }, { status: 404 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, emailVerified: new Date() },
  });

  return NextResponse.json({
    success: true,
    email: user.email,
  });
}
