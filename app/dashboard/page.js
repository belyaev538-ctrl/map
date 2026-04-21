"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [sheetUrl, setSheetUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  async function saveProject(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      console.log("Saving project:", sheetUrl);
      console.log("Token:", token);

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          sheetUrl: sheetUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Failed to save project");
        return;
      }
      setMessage("Project saved");
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 560 }}>
      <h1 className="title">Dashboard</h1>
      <p className="muted">Сохраните ссылку на Google Sheets проекта.</p>

      <form onSubmit={saveProject} className="form">
        <input
          className="input"
          type="url"
          placeholder="Google Sheets URL"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          required
        />
        <button className="button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save project"}
        </button>
      </form>

      {message ? <p className={message === "Project saved" ? "success" : "error"}>{message}</p> : null}
      </section>
    </main>
  );
}
