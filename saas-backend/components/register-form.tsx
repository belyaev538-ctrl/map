"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Ошибка регистрации");
        setLoading(false);
        return;
      }
      router.push("/login?registered=1");
    } catch {
      setError("Сеть недоступна. Попробуйте позже.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Регистрация</h1>
        <p className="mt-1 text-sm text-slate-600">Минимум 8 символов в пароле</p>
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Создание…" : "Создать аккаунт"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-sky-700 hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
