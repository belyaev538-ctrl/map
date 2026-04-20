"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось создать проект");
        setLoading(false);
        return;
      }
      setName("");
      setLoading(false);
      router.refresh();
    } catch {
      setError("Сеть недоступна");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
    >
      <label className="block flex-1 text-sm font-medium text-slate-700">
        Название проекта
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Москва Q1"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </label>
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="h-10 shrink-0 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Создание…" : "Создать проект"}
      </button>
      {error ? (
        <p className="w-full text-sm text-red-600 sm:order-last sm:basis-full" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
