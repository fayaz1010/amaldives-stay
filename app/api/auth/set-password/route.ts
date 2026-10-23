import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isValidToken } from '@/lib/set-password-token';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/set-password
 * Body: { token: string, password: string }
 *
 * Validates the set-password token, sets the user's password, and clears the token.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json(
      { error: 'Token and password are required' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  try {
    // Find user with this token (we store the hashed version)
    // We need to check all users with a non-null token since we store it hashed
    const users = await prisma.user.findMany({
      where: {
        setPasswordToken: { not: null },
        setPasswordTokenExpiresAt: { not: null },
      },
      select: {
        id: true,
        email: true,
        setPasswordToken: true,
        setPasswordTokenExpiresAt: true,
        tenant: {
          select: {
            subdomain: true,
          },
        },
      },
    });

    // Find the matching user by validating the token against stored hashes
    const matchingUser = users.find((user) => {
      if (!user.setPasswordToken || !user.setPasswordTokenExpiresAt) {
        return false;
      }
      return isValidToken(token, user.setPasswordToken, user.setPasswordTokenExpiresAt);
    });

    if (!matchingUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please request a new verification link.' },
        { status: 401 }
      );
    }

    // Hash the new password and update the user
    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: matchingUser.id },
      data: {
        password: hashedPassword,
        emailVerified: new Date(), // Mark email as verified
        setPasswordToken: null, // Clear the token (single-use)
        setPasswordTokenExpiresAt: null,
      },
    });

    // Return success with login URL
    const subdomain = matchingUser.tenant?.subdomain;
    const loginUrl = subdomain
      ? `https://${subdomain}.vayves.com/auth/signin`
      : '/auth/signin';

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      loginUrl,
    });
  } catch (error: any) {
    console.error('[set-password] error:', error);
    return NextResponse.json(
      { error: 'Failed to set password. Please try again.' },
      { status: 500 }
    );
  }
}
