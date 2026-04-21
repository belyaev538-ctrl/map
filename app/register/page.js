"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Registration failed");
        return;
      }
      router.push("/login");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
      <h1 className="title">Регистрация</h1>
      <p className="muted">Создайте новый аккаунт.</p>
      <form onSubmit={onRegister} className="form">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="label" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          className="input"
          type="password"
          placeholder="Минимум 8 символов"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Loading..." : "Register"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <p className="row">
        Уже есть аккаунт? <Link className="link" href="/login">Войти</Link>
      </p>
      </section>
    </main>
  );
}
