import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return NextResponse.json({ error: "Укажите корректный email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен быть не короче 8 символов" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: emailRaw,
        password: passwordHash,
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ ok: true, success: true }, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Пользователь с таким email уже есть" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Ошибка регистрации";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
