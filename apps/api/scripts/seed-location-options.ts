import 'reflect-metadata';

import { PrismaService } from '../src/database/prisma.service';
import { upsertSystemSeededCities } from '../src/locations/system-seeded-cities';

async function main() {
  const prisma = new PrismaService();

  try {
    const result = await upsertSystemSeededCities(prisma as never);
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
