"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "./bottom-sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (q: string) => void;
};

export function SearchBottomSheet({ open, onClose, value, onChange }: Props) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value, open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Поиск" z={52}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-600">Название, адрес, статус</span>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={local}
          onChange={(e) => {
            const v = e.target.value;
            setLocal(v);
            onChange(v);
          }}
          placeholder="Начните вводить…"
          className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-4 text-lg text-slate-900 outline-none ring-sky-500 focus:border-sky-500 focus:ring-2"
        />
      </label>
      <button
        type="button"
        className="mt-6 w-full min-h-[52px] rounded-2xl bg-sky-600 text-lg font-semibold text-white active:bg-sky-700"
        onClick={onClose}
      >
        Готово
      </button>
    </BottomSheet>
  );
}
