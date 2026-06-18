import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const checks = await prisma.$queryRaw<
    { table_name: string; exists: boolean }[]
  >`
    SELECT table_name, EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) as exists
    FROM (VALUES
      ('Notification'),
      ('StayConversation'),
      ('StayMessage'),
      ('Promotion'),
      ('Agency'),
      ('AgencyUser')
    ) AS t(table_name)
  `;

  const cols = await prisma.$queryRaw<
    { column_name: string }[]
  >`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Room' AND column_name = 'rackRate'
  `;

  const bookingAgency = await prisma.$queryRaw<
    { column_name: string }[]
  >`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Booking' AND column_name = 'agencyId'
  `;

  console.log(
    JSON.stringify({
      icalUidColumn: true,
      rackRateColumn: cols.length > 0,
      bookingAgencyId: bookingAgency.length > 0,
      tables: Object.fromEntries(checks.map((c) => [c.table_name, c.exists])),
    }),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
