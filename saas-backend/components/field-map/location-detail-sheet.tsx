"use client";

import { FIELD_STATUS_PRESETS, type FieldLocation } from "@/lib/field-map/types";
import { colorForStatusName } from "@map-statuses";
import { telHref } from "@/lib/tel-link";
import { useMemo, useState } from "react";
import { BottomSheet } from "./bottom-sheet";

type Props = {
  open: boolean;
  location: FieldLocation | null;
  onClose: () => void;
  onPatched: (loc: FieldLocation) => void;
};

export function LocationDetailSheet({ open, location, onClose, onPatched }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectOptions = useMemo(() => {
    if (!location) {
      return [];
    }
    const s = new Set<string>([...FIELD_STATUS_PRESETS, location.status]);
    return [...s].sort((a, b) => a.localeCompare(b, "ru"));
  }, [location]);

  const tel = useMemo(() => {
    if (!location) {
      return null;
    }
    return telHref(location.address);
  }, [location]);

  const directionsUrl = useMemo(() => {
    if (!location) {
      return "";
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
  }, [location]);

  async function patchStatus(next: string) {
    if (!location) {
      return;
    }
    const st = next.trim();
    if (!st || st === location.status) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: st }),
      });
      const data = (await res.json().catch(() => ({}))) as FieldLocation & { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Ошибка");
      }
      onPatched(data as FieldLocation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (!location) {
    return null;
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Точка" z={55}>
      <div className="space-y-4">
        <div>
          <p className="text-xl font-semibold leading-snug text-slate-900">{location.name}</p>
          {location.address ? (
            <p className="mt-2 text-base leading-relaxed text-slate-600">{location.address}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
          <span
            className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white drop-shadow-sm"
            style={{ backgroundColor: colorForStatusName(location.status) }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Статус</p>
            <p className="truncate text-lg font-semibold text-slate-900">{location.status}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Быстрый выбор</p>
          <div className="grid grid-cols-2 gap-3">
            {FIELD_STATUS_PRESETS.map((st) => (
              <button
                key={st}
                type="button"
                disabled={saving}
                onClick={() => void patchStatus(st)}
                className={`min-h-[52px] rounded-2xl border-2 px-3 text-base font-semibold active:scale-[0.98] disabled:opacity-50 ${
                  st === location.status
                    ? "border-sky-600 bg-sky-50 text-sky-900"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Все варианты</span>
          <select
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg font-medium text-slate-900"
            value={selectOptions.includes(location.status) ? location.status : selectOptions[0]}
            disabled={saving}
            onChange={(e) => void patchStatus(e.target.value)}
          >
            {selectOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-lg font-semibold text-white active:bg-slate-800"
        >
          Построить маршрут
        </a>

        {tel ? (
          <a
            href={tel}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-lg font-semibold text-white active:bg-emerald-700"
          >
            Позвонить
          </a>
        ) : (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Номер не найден в адресе. Добавьте телефон в текст адреса или расширьте модель данных.
          </p>
        )}

        {error ? (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {saving ? <p className="text-center text-sm text-slate-500">Сохранение…</p> : null}
      </div>
    </BottomSheet>
  );
}
