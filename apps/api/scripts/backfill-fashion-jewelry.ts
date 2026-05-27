import 'reflect-metadata';

import { PrismaService } from '../src/database/prisma.service';
import { runBackfillOnce } from './backfill-fashion-jewelry-runner';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(2);
  }

  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const confirmed = argv.includes('--confirm-apply');

  if (apply && !confirmed) {
    console.error('--apply requires --confirm-apply to avoid accidents.');
    process.exit(2);
  }

  const prisma = new PrismaService();
  try {
    const result = await runBackfillOnce(prisma as any, { apply: apply && confirmed });
    console.log(
      JSON.stringify(
        {
          mode: apply && confirmed ? 'apply' : 'dry-run',
          ...result,
        },
        null,
        2,
      ),
    );
    if (result.aborted) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
