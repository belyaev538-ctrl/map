"use client";

import type { FieldLocation } from "@/lib/field-map/types";
import { colorForStatusName } from "@map-statuses";
import L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

type ClusterGroup = L.Layer & {
  addLayer: (layer: L.Layer) => unknown;
  clearLayers: () => void;
};

/** Радиус круга в px (Leaflet `circleMarker.radius`). */
const R_BASE = 7;
const R_HOVER = Math.round(R_BASE * 1.1);
const R_SELECTED = Math.round(R_BASE * 1.25);

const markerStyle = (fill: string, radius: number) => ({
  radius,
  color: "#ffffff",
  weight: 2,
  fillColor: fill,
  fillOpacity: 1,
});

type Props = {
  locations: FieldLocation[];
  selectedLocationId: string | null;
  onMarkerClick: (loc: FieldLocation) => void;
};

export function FieldClusterLayer({ locations, selectedLocationId, onMarkerClick }: Props) {
  const map = useMap();
  const groupRef = useRef<ClusterGroup | null>(null);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedLocationId;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await import("leaflet.markercluster");
      if (cancelled || !map) {
        return;
      }

      const factory = (L as unknown as { markerClusterGroup?: (opts: object) => ClusterGroup })
        .markerClusterGroup;
      if (!factory) {
        return;
      }

      const group = factory({
        maxClusterRadius: 54,
        disableClusteringAtZoom: 17,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        animate: false,
        removeOutsideVisibleBounds: true,
        chunkDelay: 32,
      });

      for (const loc of locations) {
        const fill = colorForStatusName(loc.status);
        const r = loc.id === selectedLocationId ? R_SELECTED : R_BASE;
        const cm = L.circleMarker([loc.lat, loc.lng], markerStyle(fill, r));
        cm.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          clickRef.current(loc);
        });
        cm.on("mouseover", () => {
          if (loc.id !== selectedIdRef.current) {
            cm.setStyle(markerStyle(fill, R_HOVER));
          }
        });
        cm.on("mouseout", () => {
          const nextR = loc.id === selectedIdRef.current ? R_SELECTED : R_BASE;
          cm.setStyle(markerStyle(fill, nextR));
        });
        group.addLayer(cm);
      }

      map.addLayer(group);
      groupRef.current = group;
    })();

    return () => {
      cancelled = true;
      const g = groupRef.current;
      groupRef.current = null;
      if (g && map) {
        map.removeLayer(g);
      }
    };
  }, [map, locations, selectedLocationId]);

  return null;
}
