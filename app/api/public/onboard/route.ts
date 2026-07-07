import { NextRequest, NextResponse } from 'next/server';
import { ROOT_DOMAIN } from '@/lib/domain';

export const dynamic = 'force-dynamic';

/** Direct unverified signup is disabled — owners must verify domain email via /claim. */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        `Direct signup is disabled. Go to ${ROOT_DOMAIN}/claim and verify with your business email.`,
    },
    { status: 410 }
  );
}
