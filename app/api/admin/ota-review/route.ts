import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { reconcileStoredExtraction } from '@/lib/ota-email-verify';
import type { OtaMessageStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: OtaMessageStatus[] = ['CREATED', 'UPDATED', 'CANCELLED', 'NEEDS_REVIEW', 'REJECTED', 'FAILED'];

/** List OTA email audit/review rows for the operator's tenant. Defaults to the pending review queue. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status');
  const status = statusParam && VALID_STATUSES.includes(statusParam as OtaMessageStatus)
    ? (statusParam as OtaMessageStatus)
    : 'NEEDS_REVIEW';
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10) || 30));

  const messages = await prisma.otaEmailMessage.findMany({
    where: { tenantId: session.user.tenantId, status },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { booking: { select: { id: true, confirmationNumber: true, status: true } } },
  });

  const withSuggestion = messages.map((m) => ({
    ...m,
    suggested: reconcileStoredExtraction(m.regexResult, m.aiResult),
  }));

  const counts = await prisma.otaEmailMessage.groupBy({
    by: ['status'],
    where: { tenantId: session.user.tenantId },
    _count: { _all: true },
  });

  return NextResponse.json({
    messages: withSuggestion,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  });
}
