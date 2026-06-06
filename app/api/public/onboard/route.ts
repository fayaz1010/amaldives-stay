import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Direct unverified signup is disabled — owners must verify domain email via /claim. */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Direct signup is disabled. Go to stay.amaldives.com/claim and verify with your business email.',
    },
    { status: 410 }
  );
}
