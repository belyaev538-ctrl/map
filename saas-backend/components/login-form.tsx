"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registered = searchParams.get("registered");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось войти");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Вход</h1>
        <p className="mt-1 text-sm text-slate-600">Введите email и пароль</p>
      </div>
      {registered ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Регистрация прошла успешно. Войдите в аккаунт.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Пароль
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Вход…" : "Войти"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-sky-700 hover:underline">
          Регистрация
        </Link>
      </p>
    </form>
  );
}
