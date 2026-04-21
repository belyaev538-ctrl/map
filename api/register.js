const { Prisma } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { EMAIL_RE, hashPassword } = require("../lib/map-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return res.status(400).json({ ok: false, error: "Укажите корректный email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: "Пароль не короче 8 символов" });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { email: emailRaw, password: passwordHash },
    });
    return res.status(201).json({ ok: true, success: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Пользователь с таким email уже есть" });
    }
    const msg = e instanceof Error ? e.message : "Ошибка регистрации";
    return res.status(500).json({ ok: false, error: msg });
  }
};
