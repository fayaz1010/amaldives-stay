/**
 * Runtime smoke test — invokes the new sync/notification functions against
 * the real DB. Reports counts and confirms nothing crashes. Safe to run
 * repeatedly: syncArrivalEtasFromFlightBoard is idempotent, and
 * sendPendingNotifications only acts on rows due now.
 *
 *   npx tsx --env-file=.env.local scripts/smoke-runtime.ts
 */
import { syncArrivalEtasFromFlightBoard } from '../lib/flight-arrival-sync';
import { sendPendingNotifications, queueNotification } from '../lib/notifications';
import { prisma } from '../lib/db';

async function main() {
  console.log('\n[A] syncArrivalEtasFromFlightBoard()');
  const fl = await syncArrivalEtasFromFlightBoard();
  console.log('   →', fl);

  console.log('\n[B] queueNotification() + sendPendingNotifications() (DRY — only counts if no tenant)');
  // Pick any tenant so we can write one real test row without polluting the table.
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  if (!tenant) {
    console.log('   no tenant found — skipping queue test');
  } else {
    const queued = await queueNotification({
      tenantId: tenant.id,
      channel: 'EMAIL',
      type: 'SMOKE_TEST',
      to: 'verify@ical.stay.local',
      subject: 'verify smoke',
      body: '<p>verify smoke</p>',
      // Schedule far in the future so the cron drain skips it — we just want
      // to prove the row writes cleanly.
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    console.log('   queued id=', queued.id, 'status=', queued.status, 'channel=', queued.channel);

    // Drain anything that's already due (sends real email only if Resend is configured).
    const drain = await sendPendingNotifications({ limit: 5 });
    console.log('   sendPendingNotifications →', drain);

    // Clean up our smoke row so we don't leak it.
    await prisma.notification.delete({ where: { id: queued.id } });
    console.log('   cleaned up smoke row');
  }

  // Check whether icalUid is referenced from any existing rows
  const otaBookings = await prisma.booking.count({ where: { icalUid: { not: null } } });
  console.log('\n[C] Booking rows with icalUid set:', otaBookings);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('SMOKE FAILED:', e);
  await prisma.$disconnect();
  process.exit(1);
});
