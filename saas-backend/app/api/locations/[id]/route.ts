import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session-user";
import { findLocationForUser } from "@/lib/location-access";
import { resolveStatusId } from "@/lib/resolve-status";
import { serializeLocation } from "@/lib/serialize-location";

type RouteContext = { params: Promise<{ id: string }> } | { params: { id: string } };

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

function parseDate(v: unknown): Date | null | undefined {
  if (v === undefined) {
    return undefined;
  }
  if (v === null || v === "") {
    return null;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return undefined;
}

/**
 * PATCH /api/locations/:id
 * Body: { name?, address?, lat?, lng?, status? | statusKey?, assignedToId? | null, nextVisitAt? | null }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const locationId = params.id;

  const existing = await findLocationForUser(locationId, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  const data: Prisma.LocationUncheckedUpdateInput = {};

  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = n;
  }
  if (typeof body.address === "string") {
    data.address = body.address.trim();
  }
  if (body.lat !== undefined) {
    const lat = parseCoord(body.lat);
    if (lat == null) {
      return NextResponse.json({ error: "invalid lat" }, { status: 400 });
    }
    data.lat = new Prisma.Decimal(String(lat));
  }
  if (body.lng !== undefined) {
    const lng = parseCoord(body.lng);
    if (lng == null) {
      return NextResponse.json({ error: "invalid lng" }, { status: 400 });
    }
    data.lng = new Prisma.Decimal(String(lng));
  }

  const statusKey = typeof body.statusKey === "string" ? body.statusKey.trim() : null;
  const statusName = typeof body.status === "string" ? body.status.trim() : null;
  if (statusKey || statusName) {
    const sid = await resolveStatusId({ key: statusKey, name: statusName });
    if (!sid) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    data.statusId = sid;
  }

  if (body.assignedToId === null) {
    data.assignedToId = null;
  } else if (typeof body.assignedToId === "string") {
    const aid = body.assignedToId.trim();
    if (!aid) {
      data.assignedToId = null;
    } else {
      const u = await prisma.user.findFirst({ where: { id: aid }, select: { id: true } });
      if (!u) {
        return NextResponse.json({ error: "assignedToId user not found" }, { status: 400 });
      }
      data.assignedToId = aid;
    }
  }

  if ("nextVisitAt" in body) {
    const nv = parseDate(body.nextVisitAt);
    if (nv === undefined) {
      /* skip */
    } else {
      data.nextVisitAt = nv;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  try {
    const row = await prisma.location.update({
      where: { id: locationId },
      data,
      include: { status: true },
    });
    return NextResponse.json(serializeLocation(row));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
