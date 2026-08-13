/**
 * Provision (or update) a PLATFORM agency — an agency with tenantId null that
 * can book every ACTIVE tenant's inventory at its markup — and attach agent
 * users to it. Built for the amaldives / Lateral Investments desk (Raya).
 *
 * Usage:
 *   npx tsx scripts/create-platform-agency.ts \
 *     --name "amaldives (Lateral Investments)" \
 *     --markup -15 \
 *     --agent raya@amaldives.com [--agent-name "Raya"] [--password <pw>]
 *
 * Idempotent: re-running updates markup and adds missing agents. An agent
 * user that does not exist is created (role GUEST + AgencyUser row — the
 * agent portal authorizes via AgencyUser, not User.role).
 */
import { PrismaClient, AgencyRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg('--name');
  if (!name) throw new Error('--name required');
  const markup = arg('--markup') ? Number(arg('--markup')) : 0;
  if (!Number.isFinite(markup)) throw new Error('--markup must be a number');
  const agentEmailRaw = arg('--agent');
  const agentName = arg('--agent-name') ?? 'Agent';
  const password = arg('--password') ?? crypto.randomBytes(6).toString('base64url');

  let agency = await prisma.agency.findFirst({ where: { tenantId: null, name } });
  if (agency) {
    agency = await prisma.agency.update({
      where: { id: agency.id },
      data: { markupPercent: markup, isActive: true },
    });
    console.log(`updated platform agency ${agency.id} (${name}) markup=${markup}`);
  } else {
    agency = await prisma.agency.create({
      data: { tenantId: null, name, markupPercent: markup, isActive: true },
    });
    console.log(`created platform agency ${agency.id} (${name}) markup=${markup}`);
  }

  if (agentEmailRaw) {
    const email = agentEmailRaw.trim().toLowerCase();
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    let createdUser = false;
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: agentName,
          password: await bcrypt.hash(password, 12),
          role: 'GUEST',
          emailVerified: new Date(),
        },
      });
      createdUser = true;
    }
    const existing = await prisma.agencyUser.findUnique({ where: { userId: user.id } });
    if (existing && existing.agencyId !== agency.id) {
      throw new Error(`user ${email} already belongs to another agency (${existing.agencyId})`);
    }
    if (!existing) {
      await prisma.agencyUser.create({
        data: { agencyId: agency.id, userId: user.id, role: AgencyRole.ADMIN },
      });
    }
    console.log(
      `agent ${email} attached to ${name}` +
        (createdUser ? ` — temp password: ${password} (share securely, change on first login)` : ''),
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
