import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/super-admin/claims/reject
 * Body: { claimId: string, reason?: string }
 *
 * Marks a claim as rejected with an optional reason.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { claimId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const claimId = body.claimId;
  if (!claimId) {
    return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
  }

  const claim = await prisma.claimAssistRequest.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.status === 'verified') {
    return NextResponse.json({ 
      error: 'Cannot reject a verified claim',
    }, { status: 409 });
  }

  try {
    // Update the claim with rejection status and optional reason
    await prisma.claimAssistRequest.update({
      where: { id: claimId },
      data: { 
        status: 'rejected',
        rejectedReason: body.reason || null,
        rejectedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Claim rejected',
    });
  } catch (error: any) {
    console.error('[reject-claim] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject claim' },
      { status: 500 }
    );
  }
}
