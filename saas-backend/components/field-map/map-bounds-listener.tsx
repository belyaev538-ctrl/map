"use client";

import type { LatLngBounds } from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import { useCallback, useEffect, useRef } from "react";

type Props = {
  /** Вызывается после паузы при сдвиге/зуме карты */
  onBoundsStable: (bounds: LatLngBounds) => void;
  debounceMs?: number;
};

export function MapBoundsListener({ onBoundsStable, debounceMs = 400 }: Props) {
  const map = useMap();
  const cbRef = useRef(onBoundsStable);
  cbRef.current = onBoundsStable;
  const timer = useRef<number>();

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      cbRef.current(map.getBounds());
    }, debounceMs);
  }, [map, debounceMs]);

  useMapEvents({
    moveend: schedule,
    zoomend: schedule,
  });

  useEffect(() => {
    schedule();
    return () => window.clearTimeout(timer.current);
  }, [map, schedule]);

  return null;
}
