import { prisma } from "./prisma";

/**
 * Проект принадлежит пользователю — иначе null (как 404 для чужих id).
 */
export async function findProjectForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, userId: true },
  });
}
