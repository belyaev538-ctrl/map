import { NextResponse } from "next/server";
import { nextAuthSessionCookieName, nextAuthSessionCookieSecure } from "@/lib/session-cookie";

/** Сброс cookie сессии (для fetch-клиентов; в UI обычно достаточно signOut из next-auth/react). */
export async function POST() {
  const name = nextAuthSessionCookieName();
  const secure = nextAuthSessionCookieSecure();
  const res = NextResponse.json({ ok: true, success: true });
  res.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  });
  return res;
}
