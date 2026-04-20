"use client";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { FieldLocation, StatusCatalogRow } from "@/lib/field-map/types";
import type { LatLngBounds } from "leaflet";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddLocationFullScreen } from "./add-location-fullscreen";
import { FieldMapHeader } from "./field-map-header";
import { FiltersBottomSheet } from "./filters-bottom-sheet";
import type { FlyTarget } from "./field-map-inner";
import { LocationDetailSheet } from "./location-detail-sheet";
import { SearchBottomSheet } from "./search-bottom-sheet";

const FieldMapInner = dynamic(
  () => import("./field-map-inner").then((m) => ({ default: m.FieldMapInner })),
  { ssr: false, loading: () => <FieldMapSkeleton /> }
);

function FieldMapSkeleton() {
  return (
    <div className="absolute inset-0 z-0 bg-slate-200">
      <div className="animate-pulse">
        <div className="absolute left-[15%] top-[28%] h-40 w-48 rounded-3xl bg-slate-300/90" />
        <div className="absolute right-[12%] top-[42%] h-32 w-40 rounded-3xl bg-slate-300/70" />
        <div className="absolute left-[38%] top-[54%] h-36 w-44 rounded-3xl bg-slate-300/80" />
      </div>
    </div>
  );
}

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];

type Props = {
  projectId: string;
  projectName: string;
};

export function FieldProjectView({ projectId, projectName }: Props) {
  const boundsRef = useRef<LatLngBounds | null>(null);
  const [locations, setLocations] = useState<FieldLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [statusCatalog, setStatusCatalog] = useState<StatusCatalogRow[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [readyOnly, setReadyOnly] = useState(false);
  const [hideRefusal, setHideRefusal] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const debouncedQ = useDebouncedValue(searchQ, 350);
  const clusterLocations = useDebouncedValue(locations, 280);

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<FieldLocation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const fetchForBounds = useCallback(
    async (bounds: LatLngBounds) => {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const sp = new URLSearchParams();
      sp.set("south", String(sw.lat));
      sp.set("west", String(sw.lng));
      sp.set("north", String(ne.lat));
      sp.set("east", String(ne.lng));
      const q = debouncedQ.trim();
      if (q) {
        sp.set("q", q);
      }
      if (readyOnly) {
        sp.set("readyOnly", "1");
      } else {
        const keys = statusCatalog.map((r) => r.key);
        const active = statusCatalog.filter((r) => checked[r.key]).map((r) => r.key);
        if (keys.length > 0 && active.length === 0) {
          setLocations([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
        if (active.length > 0 && active.length < keys.length) {
          for (const k of active) {
            sp.append("includeStatus", k);
          }
        }
        if (hideRefusal) {
          sp.set("hideRefusal", "1");
        }
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/locations?${sp.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Ошибка загрузки");
          setLocations([]);
          setHasMore(false);
        } else {
          const locs = (data.locations as FieldLocation[]) || [];
          setLocations(locs);
          setHasMore(Boolean(data.hasMore));
        }
      } catch {
        setError("Сеть недоступна");
        setLocations([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [projectId, debouncedQ, readyOnly, hideRefusal, statusCatalog, checked]
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/locations/meta`);
        const data = await res.json().catch(() => ({}));
        const rows = (data.statuses as StatusCatalogRow[]) || [];
        setStatusCatalog(rows);
        setChecked(Object.fromEntries(rows.map((r) => [r.key, true])));
      } catch {
        /* ignore */
      }
    })();
  }, [projectId]);

  useEffect(() => {
    if (statusCatalog.length > 0) {
      setChecked((prev) => {
        const next = { ...prev };
        for (const r of statusCatalog) {
          if (next[r.key] === undefined) {
            next[r.key] = true;
          }
        }
        return next;
      });
    }
  }, [statusCatalog]);

  const onBoundsStable = useCallback(
    (b: LatLngBounds) => {
      boundsRef.current = b;
      void fetchForBounds(b);
    },
    [fetchForBounds]
  );

  useEffect(() => {
    if (boundsRef.current) {
      void fetchForBounds(boundsRef.current);
    }
  }, [debouncedQ, readyOnly, hideRefusal, checked, fetchForBounds, reloadTick]);

  const onMarkerClick = useCallback((loc: FieldLocation) => {
    setSelected(loc);
    setDetailOpen(true);
  }, []);

  const onPatched = useCallback((loc: FieldLocation) => {
    setLocations((prev) => prev.map((p) => (p.id === loc.id ? loc : p)));
    setSelected(loc);
  }, []);

  const onMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTarget({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          tick: Date.now(),
        });
      },
      () => {
        /* silent */
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  }, []);

  const mapCenter: [number, number] = (() => {
    if (!locations.length) {
      return DEFAULT_CENTER;
    }
    let la = 0;
    let ln = 0;
    for (const l of locations) {
      la += l.lat;
      ln += l.lng;
    }
    return [la / locations.length, ln / locations.length];
  })();

  const mapZoom = locations.length ? 11 : 10;

  const toggleStatus = useCallback((statusKey: string, next: boolean) => {
    setChecked((prev) => ({ ...prev, [statusKey]: next }));
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-slate-900">
      <FieldMapHeader
        title={projectName}
        onFilter={() => {
          setFilterOpen(true);
          setSearchOpen(false);
        }}
        onSearch={() => {
          setSearchOpen(true);
          setFilterOpen(false);
        }}
        onMyLocation={onMyLocation}
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div
            className="pointer-events-none absolute inset-0 z-[22] flex items-center justify-center bg-white/55 backdrop-blur-[1px]"
            aria-busy
            aria-label="Загрузка"
          >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
          </div>
        ) : null}
        {error ? (
          <div className="absolute left-3 right-3 top-3 z-[25] rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
            {error}
          </div>
        ) : null}
        {hasMore ? (
          <div className="absolute bottom-[5.5rem] left-1/2 z-[25] max-w-[90vw] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-xs text-white">
            Показаны не все точки в видимой области — уменьшите масштаб или сместите карту
          </div>
        ) : null}

        <FieldMapInner
          center={mapCenter}
          zoom={mapZoom}
          locations={clusterLocations}
          selectedLocationId={selected?.id ?? null}
          onBoundsStable={onBoundsStable}
          onMarkerClick={onMarkerClick}
          flyTarget={flyTarget}
        />

        <button
          type="button"
          className="safe-area-pb absolute bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-3xl font-light text-white shadow-lg shadow-sky-900/30 active:scale-95 active:bg-sky-600"
          aria-label="Добавить точку"
          onClick={() => {
            setAddOpen(true);
            setDetailOpen(false);
            setSelected(null);
          }}
        >
          +
        </button>
      </div>

      <LocationDetailSheet
        open={detailOpen && Boolean(selected)}
        location={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onPatched={onPatched}
      />

      <FiltersBottomSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        statuses={statusCatalog}
        checked={checked}
        onToggle={toggleStatus}
        readyOnly={readyOnly}
        onReadyOnly={(v) => {
          setReadyOnly(v);
          if (v) {
            setHideRefusal(false);
          }
        }}
        hideRefusal={hideRefusal}
        onHideRefusal={(v) => {
          setHideRefusal(v);
          if (v) {
            setReadyOnly(false);
          }
        }}
      />

      <SearchBottomSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        value={searchQ}
        onChange={setSearchQ}
      />

      <AddLocationFullScreen
        open={addOpen}
        onClose={() => setAddOpen(false)}
        projectId={projectId}
        defaultCenter={
          boundsRef.current
            ? {
                lat: boundsRef.current.getCenter().lat,
                lng: boundsRef.current.getCenter().lng,
              }
            : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
        }
        onCreated={() => {
          setReloadTick((n) => n + 1);
          if (boundsRef.current) {
            void fetchForBounds(boundsRef.current);
          }
        }}
      />
    </div>
  );
}
