import type { Location, Status } from "@prisma/client";
import { colorForStatusName } from "@map-statuses";

export type LocationWithStatus = Location & { status: Status };

/** Плоский DTO для карты / мобильного клиента */
export function serializeLocation(loc: LocationWithStatus) {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    lat: Number(loc.lat),
    lng: Number(loc.lng),
    status: loc.status.name,
    statusKey: loc.status.key,
    statusId: loc.status.id,
    statusColor: colorForStatusName(loc.status.name),
    assignedToId: loc.assignedToId,
    nextVisitAt: loc.nextVisitAt?.toISOString() ?? null,
    createdAt: loc.createdAt.toISOString(),
    updatedAt: loc.updatedAt.toISOString(),
  };
}
