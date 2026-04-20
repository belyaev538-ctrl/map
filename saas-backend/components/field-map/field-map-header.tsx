"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

type Props = {
  title: string;
  onFilter: () => void;
  onSearch: () => void;
  onMyLocation: () => void;
};

export function FieldMapHeader({ title, onFilter, onSearch, onMyLocation }: Props) {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <header className="safe-area-pt flex h-[52px] shrink-0 items-center gap-1 border-b border-slate-800/50 bg-slate-900 px-1 text-white shadow-md">
      <Link
        href="/dashboard"
        className="touch-hit flex shrink-0 items-center justify-center rounded-xl active:bg-white/10"
        aria-label="К проектам"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <h1 className="min-w-0 flex-1 truncate px-1 text-center text-base font-semibold tracking-tight">
        {title}
      </h1>
      <button
        type="button"
        className="touch-hit flex shrink-0 items-center justify-center rounded-xl active:bg-white/10"
        aria-label="Фильтры"
        onClick={onFilter}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M7 12h10M10 18h4"
          />
        </svg>
      </button>
      <button
        type="button"
        className="touch-hit flex shrink-0 items-center justify-center rounded-xl active:bg-white/10"
        aria-label="Поиск"
        onClick={onSearch}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>
      </button>
      <button
        type="button"
        className="touch-hit flex shrink-0 items-center justify-center rounded-xl active:bg-white/10"
        aria-label="Моё местоположение"
        onClick={onMyLocation}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 21.5s7.5-5.2 7.5-11A7.5 7.5 0 004.5 10.5c0 5.8 7.5 11 7.5 11z"
          />
          <circle cx="12" cy="10.5" r="2.5" strokeWidth={2} />
        </svg>
      </button>
      <button
        type="button"
        disabled={signingOut}
        className="touch-hit shrink-0 rounded-xl px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/90 active:bg-white/10 disabled:opacity-50"
        onClick={() => {
          setSigningOut(true);
          void signOut({ callbackUrl: "/login" });
        }}
      >
        {signingOut ? "…" : "Выйти"}
      </button>
    </header>
  );
}
