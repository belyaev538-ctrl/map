"use client";

import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";

type Target = { lat: number; lng: number; tick: number };

/**
 * Сдвигает карту к точке (например, геолокация пользователя).
 */
export function MapFlyTo({ target }: { target: Target | null }) {
  const map = useMap();
  const prev = useRef<number>(0);

  useEffect(() => {
    if (!target || target.tick === prev.current) {
      return;
    }
    prev.current = target.tick;
    const z = Math.max(map.getZoom(), 15);
    map.flyTo([target.lat, target.lng], z, { duration: 0.45 });
  }, [map, target]);

  return null;
}
