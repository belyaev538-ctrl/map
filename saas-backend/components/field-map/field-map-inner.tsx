"use client";

import type { FieldLocation } from "@/lib/field-map/types";
import type { LatLngBounds, LatLngExpression } from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import { FieldClusterLayer } from "./field-cluster-layer";
import { MapBoundsListener } from "./map-bounds-listener";
import { MapFlyTo } from "./map-fly-to";

export type FlyTarget = { lat: number; lng: number; tick: number };

type Props = {
  center: LatLngExpression;
  zoom: number;
  locations: FieldLocation[];
  selectedLocationId: string | null;
  onBoundsStable: (b: LatLngBounds) => void;
  onMarkerClick: (loc: FieldLocation) => void;
  flyTarget?: FlyTarget | null;
};

export function FieldMapInner({
  center,
  zoom,
  locations,
  selectedLocationId,
  onBoundsStable,
  onMarkerClick,
  flyTarget = null,
}: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="absolute inset-0 z-0 h-full w-full touch-manipulation outline-none"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBoundsListener onBoundsStable={onBoundsStable} debounceMs={400} />
      <MapFlyTo target={flyTarget} />
      <FieldClusterLayer
        locations={locations}
        selectedLocationId={selectedLocationId}
        onMarkerClick={onMarkerClick}
      />
    </MapContainer>
  );
}
