
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isValidEmail } from '@/lib/utils';
import { notifyHqLead } from '@/lib/ozsystems-lead';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import {
  createSignupVerification,
  sendSignupVerificationEmail,
} from '@/lib/send-signup-verification';

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(`signup:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return tooManyRequests();

    const { name, email: rawEmail, password } = await request.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists (case-insensitive: legacy rows may be mixed-case)
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'GUEST', // Default role
      },
    });

    // Create guest profile
    await prisma.guestProfile.create({
      data: {
        userId: user.id,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
      },
    });

    // Email verification (fire-safe — account exists either way; sign-in is
    // gated on emailVerified for new GUEST accounts in lib/auth.ts)
    try {
      const token = await createSignupVerification(email);
      await sendSignupVerificationEmail({ to: email, name, token });
    } catch (err) {
      console.error('[signup] verification email failed:', err);
    }

    // Lead capture → Oz Systems HQ (fire-safe, never breaks the flow)
    await notifyHqLead({
      intent: 'signup',
      name,
      email,
      metadata: { entry_point: 'auth_signup', role: 'GUEST' },
    });

    return NextResponse.json(
      { message: 'Account created — check your email to confirm your address before signing in.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
