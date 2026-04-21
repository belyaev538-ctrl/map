const { prisma } = require("../lib/prisma");
const { verifyPassword, signUserToken } = require("../lib/map-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Укажите email и пароль" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ ok: false, error: "Неверный email или пароль" });
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Неверный email или пароль" });
    }

    const token = signUserToken(user.id, user.email);
    return res.json({
      ok: true,
      token,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRES_IN || "30d",
      email: user.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка входа";
    return res.status(500).json({ ok: false, error: msg });
  }
};
