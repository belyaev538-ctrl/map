 "use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LS_JWT_KEY = "sheet_map_jwt_v1";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem(LS_JWT_KEY);
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Dashboard</h1>
      <p>Dashboard</p>
    </main>
  );
}
