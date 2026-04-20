import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 safe-area-pt">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-900 hover:text-sky-700">
            Карта клиентов
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">{children}</main>
    </>
  );
}
