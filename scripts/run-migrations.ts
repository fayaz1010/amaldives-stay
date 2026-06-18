/**
 * Apply all prisma/migrations/*.sql files in filename order via Prisma CLI.
 * Usage: npx tsx --env-file=.env.local scripts/run-migrations.ts
 */
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'prisma/migrations');

function main() {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const path = join(dir, file);
    process.stdout.write(`Applying ${file}…\n`);
    try {
      execSync(`npx prisma db execute --file "${path}" --schema prisma/schema.prisma`, {
        stdio: 'pipe',
        env: process.env,
      });
      process.stdout.write(`  ok\n`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        process.stdout.write(`  skip (already applied)\n`);
      } else {
        throw e;
      }
    }
  }
  process.stdout.write(`Done — ${files.length} migration file(s).\n`);
}

main();
