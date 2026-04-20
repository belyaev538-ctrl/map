import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session-user";
import { serializeLocation } from "@/lib/serialize-location";

type RouteContext = { params: Promise<{ id: string }> } | { params: { id: string } };

const DEFAULT_TAKE = 900;
const MAX_TAKE = 2000;
const NO_BBOX_MAX = 500;

/**
 * GET /api/projects/:id/locations
 *
 * Query:
 * - south, west, north, east — bbox (все четыре вместе)
 * - q — поиск по названию / адресу / статусу
 * - includeStatus — повторяющийся: ключ статуса (visit, refusal, …)
 * - hideRefusal=1 — скрыть ключ refusal
 * - readyOnly=1 — только ready_to_pay
 * - take, cursor (id asc)
 */
export async function GET(request: Request, context: RouteContext) {
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

  const sp = new URL(request.url).searchParams;
  const south = sp.get("south");
  const west = sp.get("west");
  const north = sp.get("north");
  const east = sp.get("east");
  const hasBbox = south != null && west != null && north != null && east != null;

  if (hasBbox) {
    const nums = [south, west, north, east].map(Number);
    if (nums.some((n) => Number.isNaN(n))) {
      return NextResponse.json({ error: "invalid bbox" }, { status: 400 });
    }
  }

  let take = Math.min(MAX_TAKE, Math.max(1, Number(sp.get("take")) || DEFAULT_TAKE));
  if (!hasBbox) {
    take = Math.min(take, NO_BBOX_MAX);
  }

  const cursor = sp.get("cursor")?.trim() || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const includeKeys = sp.getAll("includeStatus").map((s) => s.trim()).filter(Boolean);
  const hideRefusal = sp.get("hideRefusal") === "1" || sp.get("hideRefusal") === "true";
  const readyOnly = sp.get("readyOnly") === "1" || sp.get("readyOnly") === "true";

  const filters: Prisma.LocationWhereInput[] = [];

  if (readyOnly) {
    filters.push({ status: { key: "ready_to_pay" } });
  } else {
    if (includeKeys.length > 0) {
      filters.push({ status: { key: { in: includeKeys } } });
    }
    if (hideRefusal) {
      filters.push({ NOT: { status: { key: "refusal" } } });
    }
  }

  if (q) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { status: { name: { contains: q, mode: "insensitive" } } },
        { status: { key: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.LocationWhereInput = {
    projectId,
    ...(hasBbox
      ? (() => {
          const s = Number(south);
          const w = Number(west);
          const n = Number(north);
          const e = Number(east);
          return {
            lat: { gte: Math.min(s, n), lte: Math.max(s, n) },
            lng: { gte: Math.min(w, e), lte: Math.max(w, e) },
          };
        })()
      : {}),
    ...(filters.length > 0 ? { AND: filters } : {}),
  };

  const rows = await prisma.location.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
    include: { status: true },
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? slice[slice.length - 1]?.id ?? null : null;

  return NextResponse.json({
    locations: slice.map(serializeLocation),
    nextCursor,
    hasMore,
    limitedNoBbox: !hasBbox,
  });
}
