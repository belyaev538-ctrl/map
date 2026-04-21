"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("sheet_map_jwt_v1", data.token);
        if (data.email) {
          localStorage.setItem("sheet_map_email_v1", data.email);
        }
        router.push("/dashboard");
        return;
      }
      setError(typeof data.error === "string" ? data.error : "Ошибка логина");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1 className="title">Вход</h1>
        <p className="muted">Введите email и пароль.</p>
        <form className="form" onSubmit={handleLogin}>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="label" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="Ваш пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        <p className="row">
          Нет аккаунта? <Link className="link" href="/register">Зарегистрироваться</Link>
        </p>
      </section>
    </main>
  );
}
