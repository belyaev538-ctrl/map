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
      router.push("/dashboard");
    } else {
      alert("Ошибка логина");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <input placeholder="email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <br />
      <input type="password" placeholder="password" onChange={(e) => setPassword(e.target.value)} />
      <br />
      <br />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
