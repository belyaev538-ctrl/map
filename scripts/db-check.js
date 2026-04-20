/**
 * Проверка DATABASE_URL и Prisma: соединение + наличие таблиц User и Project.
 * Запуск: npm run db:check
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Ошибка: в .env не задан DATABASE_URL");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log("Prisma: соединение с PostgreSQL установлено.");

    const rows = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('User', 'Project')
      ORDER BY tablename
    `;
    const names = Array.isArray(rows) ? rows.map((r) => r.tablename) : [];
    const need = ["Project", "User"];
    const missing = need.filter((n) => !names.includes(n));
    if (missing.length) {
      console.error("Нет таблиц:", missing.join(", "));
      console.error("Выполните: npx prisma migrate deploy");
      process.exit(1);
    }
    console.log("Таблицы в public:", names.join(", "));
    console.log("Готово: User и Project на месте.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
