/**
 * Generate test ClaimAssistRequest records for testing the super-admin
 * Claims queue.
 *
 * Usage:
 *   tsx --require dotenv/config scripts/seed-test-claims.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test claims...');

  const testClaims = [
    {
      slug: 'test-beach-resort',
      propertyName: 'Test Beach Resort',
      contactName: 'Ahmed Hassan',
      email: 'ahmed.hassan@testresort.mv',
      phone: '+9607123456',
      message: 'I am the owner of Test Beach Resort. Please verify my claim.',
      status: 'new',
    },
    {
      slug: 'paradise-inn',
      propertyName: 'Paradise Inn',
      contactName: 'Mariyam Ali',
      email: 'info@paradiseinn.com',
      phone: '+9607654321',
      message: 'We own this property and would like to claim it.',
      status: 'new',
    },
    {
      slug: 'ocean-view-guest-house',
      propertyName: 'Ocean View Guest House',
      contactName: 'Mohamed Ibrahim',
      email: 'contact@oceanview.mv',
      phone: null,
      message: null,
      status: 'new',
    },
    {
      slug: 'coral-reef-hotel',
      propertyName: 'Coral Reef Hotel',
      contactName: 'Aishath Ahmed',
      email: 'aishath@coralreef.mv',
      phone: '+9607111222',
      message: 'This is our family-owned hotel. Can you help us get verified?',
      status: 'verified',
    },
    {
      slug: 'sunset-villa',
      propertyName: 'Sunset Villa',
      contactName: 'Ali Mohamed',
      email: 'ali@sunsetvilla.mv',
      phone: '+9607333444',
      message: 'Requesting verification for Sunset Villa.',
      status: 'rejected',
    },
  ];

  for (const claim of testClaims) {
    try {
      const created = await prisma.claimAssistRequest.create({
        data: claim,
      });
      console.log(`✅ Created claim: ${created.propertyName} (${created.status})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  Skipped (already exists): ${claim.propertyName}`);
      } else {
        console.error(`❌ Error creating ${claim.propertyName}:`, error.message);
      }
    }
  }

  console.log('\n✨ Seeding complete!');
  console.log('View claims at: /super-admin/claims');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
