"use client";

import { useEffect } from "react";

export default function DashboardPage() {
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("sheet_map_jwt_v1");
    if (!token) {
      window.location.replace("/login");
      return;
    }
    window.location.replace("/index.html");
  }, []);

  return (
    <main className="page">
      <section className="card">
        <h1 className="title">Переход в кабинет...</h1>
      </section>
    </main>
  );
}
