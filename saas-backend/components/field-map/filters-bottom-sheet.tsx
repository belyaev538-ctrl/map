"use client";

import type { StatusCatalogRow } from "@/lib/field-map/types";
import { colorForStatusName } from "@map-statuses";
import { BottomSheet } from "./bottom-sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  statuses: StatusCatalogRow[];
  checked: Record<string, boolean>;
  onToggle: (statusKey: string, next: boolean) => void;
  readyOnly: boolean;
  onReadyOnly: (v: boolean) => void;
  hideRefusal: boolean;
  onHideRefusal: (v: boolean) => void;
};

export function FiltersBottomSheet({
  open,
  onClose,
  statuses,
  checked,
  onToggle,
  readyOnly,
  onReadyOnly,
  hideRefusal,
  onHideRefusal,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Фильтры" z={52}>
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Быстро</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onReadyOnly(!readyOnly)}
              className={`min-h-[52px] rounded-2xl border-2 px-4 text-left text-base font-semibold ${
                readyOnly
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              Только «Готов платить»
            </button>
            <button
              type="button"
              onClick={() => onHideRefusal(!hideRefusal)}
              className={`min-h-[52px] rounded-2xl border-2 px-4 text-left text-base font-semibold ${
                hideRefusal
                  ? "border-amber-600 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              Скрыть «Отказ»
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Статусы на карте</p>
          {statuses.length === 0 ? (
            <p className="text-sm text-slate-500">Загрузка справочника…</p>
          ) : (
            <ul className="space-y-2">
              {statuses.map((st) => (
                <li key={st.key}>
                  <label className="flex min-h-[52px] cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 active:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-6 w-6 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={Boolean(checked[st.key])}
                      disabled={readyOnly}
                      onChange={(e) => onToggle(st.key, e.target.checked)}
                    />
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white drop-shadow-sm"
                      style={{ backgroundColor: colorForStatusName(st.name) }}
                      aria-hidden
                    />
                    <span className="flex-1 text-base font-medium text-slate-900">{st.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          «Только готов платить» временно отключает чекбоксы. Снимите быстрый фильтр, чтобы снова
          настроить статусы.
        </p>
      </div>
    </BottomSheet>
  );
}
