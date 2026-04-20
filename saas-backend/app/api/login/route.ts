import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { nextAuthSessionCookieName, nextAuthSessionCookieSecure } from "@/lib/session-cookie";
import { verifyCredentials } from "@/lib/verify-credentials";

const MAX_AGE = 30 * 24 * 60 * 60;

/**
 * POST /api/login
 * Тело: { email, password }
 * При успехе — httpOnly cookie сессии NextAuth (JWT) и JSON { ok: true, success: true }.
 */
export async function POST(request: Request) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Сервер не настроен (NEXTAUTH_SECRET)" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!emailRaw.trim() || !password) {
    return NextResponse.json({ error: "Укажите email и пароль" }, { status: 400 });
  }

  const result = await verifyCredentials(emailRaw, password);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 });
    }
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const { user } = result;
  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.email,
    },
    secret,
    maxAge: MAX_AGE,
  });

  const cookieName = nextAuthSessionCookieName();
  const secure = nextAuthSessionCookieSecure();

  const res = NextResponse.json({ ok: true, success: true });
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: MAX_AGE,
  });
  return res;
}
