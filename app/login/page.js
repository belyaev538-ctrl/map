"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("sheet_map_jwt_v1", data.token);
      if (data.email) {
        localStorage.setItem("sheet_map_email_v1", data.email);
      }
      router.push("/dashboard");
    } else {
      alert("Ошибка логина");
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1 className="title">Login</h1>
        <p className="muted">Введите email и пароль.</p>
        <div className="form">
          <input className="input" placeholder="email" onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            type="password"
            placeholder="password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="button" onClick={handleLogin}>
            Login
          </button>
        </div>
      </section>
    </main>
  );
}
