import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session-user";

type RouteContext = { params: Promise<{ id: string }> } | { params: { id: string } };

/** GET /api/projects/:id/locations/meta — глобальный каталог статусов для фильтров */
export async function GET(_request: Request, context: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const projectId = params.id;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const statuses = await prisma.status.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, key: true, name: true, color: true, sortOrder: true },
  });

  return NextResponse.json({ statuses });
}
