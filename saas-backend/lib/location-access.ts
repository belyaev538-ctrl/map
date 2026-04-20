import { prisma } from "./prisma";

export async function findLocationForUser(locationId: string, userId: string) {
  return prisma.location.findFirst({
    where: {
      id: locationId,
      project: { userId },
    },
    select: { id: true, projectId: true },
  });
}
