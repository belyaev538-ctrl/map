"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultCenter: { lat: number; lng: number };
  onCreated: () => void;
};

export function AddLocationFullScreen({
  open,
  onClose,
  projectId,
  defaultCenter,
  onCreated,
}: Props) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(String(defaultCenter.lat));
  const [lng, setLng] = useState(String(defaultCenter.lng));
  const [status, setStatus] = useState("Посетить");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLat(String(defaultCenter.lat));
      setLng(String(defaultCenter.lng));
      const t = window.setTimeout(() => nameRef.current?.focus(), 180);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, defaultCenter.lat, defaultCenter.lng]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Геолокация недоступна в этом браузере");
      return;
    }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setError("Не удалось получить координаты. Проверьте разрешения.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          address: address.trim(),
          lat: Number(lat.replace(",", ".")),
          lng: Number(lng.replace(",", ".")),
          status: status.trim() || "Посетить",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Ошибка");
        setLoading(false);
        return;
      }
      setName("");
      setAddress("");
      setLoading(false);
      onClose();
      onCreated();
      router.refresh();
    } catch {
      setError("Сеть недоступна");
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[70] flex flex-col bg-white safe-area-pt">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3">
        <button
          type="button"
          className="touch-hit rounded-xl px-3 text-base font-semibold text-slate-600"
          onClick={onClose}
        >
          Отмена
        </button>
        <span className="text-base font-semibold text-slate-900">Новая точка</span>
        <span className="w-16" />
      </div>

      <form
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
      >
        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Название</span>
          <input
            ref={nameRef}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-4 text-lg text-slate-900 outline-none focus:border-sky-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Адрес</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-4 text-lg text-slate-900 outline-none focus:border-sky-500"
            placeholder="Улица, телефон в тексте"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Широта</span>
            <input
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Долгота</span>
            <input
              required
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-3 text-base"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={geoLoading}
          onClick={useMyLocation}
          className="min-h-[52px] rounded-2xl border-2 border-sky-200 bg-sky-50 text-base font-semibold text-sky-900 active:bg-sky-100 disabled:opacity-60"
        >
          {geoLoading ? "Определяем…" : "Взять мою геолокацию"}
        </button>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Статус</span>
          <input
            required
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-4 text-lg outline-none focus:border-sky-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-auto min-h-[56px] w-full rounded-2xl bg-slate-900 text-lg font-semibold text-white active:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
