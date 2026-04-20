import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const { getStatusSeedRows } = require("../../lib/map-statuses.js") as {
  getStatusSeedRows: () => { key: string; name: string; color: string; sortOrder: number }[];
};

const prisma = new PrismaClient();

async function main() {
  const rows = getStatusSeedRows();
  for (const row of rows) {
    await prisma.status.upsert({
      where: { key: row.key },
      create: row,
      update: {
        name: row.name,
        color: row.color,
        sortOrder: row.sortOrder,
      },
    });
  }
}

main()
  .then(() => {
    console.log("Seed: статусы синхронизированы.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
