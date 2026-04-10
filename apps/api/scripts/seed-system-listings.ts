import 'reflect-metadata';

import { PrismaService } from '../src/database/prisma.service';
import { upsertSystemSeedListings } from '../src/listings/system-seeded-listings';

async function main() {
  const prisma = new PrismaService();

  try {
    const result = await upsertSystemSeedListings(prisma);
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
