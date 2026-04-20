import { prisma } from "@/lib/prisma";

/** Найти статус по ключу или по отображаемому имени (как в UI). */
export async function resolveStatusId(input: { key?: string | null; name?: string | null }) {
  const key = input.key?.trim();
  const name = input.name?.trim();
  if (key) {
    const row = await prisma.status.findUnique({ where: { key } });
    return row?.id ?? null;
  }
  if (name) {
    const row = await prisma.status.findFirst({ where: { name } });
    return row?.id ?? null;
  }
  const fallback = await prisma.status.findUnique({ where: { key: "visit" } });
  return fallback?.id ?? null;
}
