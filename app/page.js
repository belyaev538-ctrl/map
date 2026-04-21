import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <h1 className="title">Map App</h1>
        <p className="muted">Вход в личный кабинет и управление проектом.</p>
        <Link href="/login" className="button link" style={{ display: "inline-block" }}>
          Login
        </Link>
      </section>
    </main>
  );
}
