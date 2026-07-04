import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { reconcileStoredExtraction } from '@/lib/ota-email-verify';
import { OtaReviewQueue } from '@/components/admin/ota-review-queue';

export const dynamic = 'force-dynamic';

export default async function OtaReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const [messages, counts] = await Promise.all([
    prisma.otaEmailMessage.findMany({
      where: { tenantId: session.user.tenantId, status: 'NEEDS_REVIEW' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.otaEmailMessage.groupBy({
      by: ['status'],
      where: { tenantId: session.user.tenantId },
      _count: { _all: true },
    }),
  ]);

  const serializable = messages.map((m) => {
    const suggestion = reconcileStoredExtraction(m.regexResult, m.aiResult);
    return {
      id: m.id,
      fromAddress: m.fromAddress,
      toAddress: m.toAddress,
      subject: m.subject,
      rawText: m.rawText,
      rawHtml: m.rawHtml,
      source: m.source,
      regexResult: m.regexResult,
      aiResult: m.aiResult,
      discrepancies: (m.discrepancies as unknown as { field: string; regexValue: unknown; aiValue: unknown }[]) ?? [],
      confidence: m.confidence,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      suggested: {
        ...suggestion,
        final: suggestion.final
          ? {
              ...suggestion.final,
              checkIn: suggestion.final.checkIn ? suggestion.final.checkIn.toISOString() : null,
              checkOut: suggestion.final.checkOut ? suggestion.final.checkOut.toISOString() : null,
            }
          : null,
      },
    };
  });

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">OTA Import Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bookings from Booking.com, Airbnb, Agoda, Expedia and Vrbo notification emails land here when Gemini
          couldn&apos;t confirm the essentials with high confidence, or disagreed with the raw email — nothing is
          guessed automatically. Review the raw email against the extracted details, edit if needed, then approve.
        </p>
      </div>
      <OtaReviewQueue initialMessages={serializable} counts={countMap} />
    </div>
  );
}
