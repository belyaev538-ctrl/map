import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type VerifyCredentialsResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: "not_found" | "bad_password" };

/** Проверка email/пароля для NextAuth и POST /api/login. */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<VerifyCredentialsResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, reason: "not_found" };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, password: true },
  });
  if (!user) {
    return { ok: false, reason: "not_found" };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { ok: false, reason: "bad_password" };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
