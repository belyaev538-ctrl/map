import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session-user";
import { findProjectForUser } from "@/lib/project-access";
import { resolveStatusId } from "@/lib/resolve-status";
import { serializeLocation } from "@/lib/serialize-location";

function parseCoord(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDate(v: unknown): Date | null {
  if (v == null || v === "") {
    return null;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * POST /api/locations
 * Body: { projectId, name, address?, lat, lng, status? | statusKey?, assignedToId?, nextVisitAt? }
 */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await findProjectForUser(projectId, userId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const lat = parseCoord(body?.lat);
  const lng = parseCoord(body?.lng);
  const statusKey = typeof body?.statusKey === "string" ? body.statusKey.trim() : null;
  const statusName = typeof body?.status === "string" ? body.status.trim() : null;
  const assignedToId =
    typeof body?.assignedToId === "string" && body.assignedToId.trim() ? body.assignedToId.trim() : null;
  const nextVisitAt = parseDate(body?.nextVisitAt);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat and lng must be valid numbers" }, { status: 400 });
  }

  const statusId = await resolveStatusId({ key: statusKey, name: statusName });
  if (!statusId) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }

  if (assignedToId) {
    const u = await prisma.user.findFirst({ where: { id: assignedToId }, select: { id: true } });
    if (!u) {
      return NextResponse.json({ error: "assignedToId user not found" }, { status: 400 });
    }
  }

  try {
    const location = await prisma.location.create({
      data: {
        projectId,
        name,
        address,
        lat: new Prisma.Decimal(String(lat)),
        lng: new Prisma.Decimal(String(lng)),
        statusId,
        assignedToId,
        nextVisitAt,
      },
      include: { status: true },
    });
    return NextResponse.json(serializeLocation(location), { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
