import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Home</h1>
      <Link href="/login">
        <button type="button">Login</button>
      </Link>
    </main>
  );
}
