const { prisma } = require("../lib/prisma");
const { getBearerUser } = require("../lib/map-auth");
const { normalizeGoogleSheetsInputToCsvUrl } = require("../lib/sheet-csv");

function getUserOr401(req, res) {
  const user = getBearerUser(req);
  if (!user) {
    res.status(401).json({
      ok: false,
      code: "UNAUTHORIZED",
      error: "Требуется вход",
      details: [],
    });
    return null;
  }
  return user;
}

module.exports = async function handler(req, res) {
  const user = getUserOr401(req, res);
  if (!user) {
    return;
  }

  if (req.method === "GET") {
    try {
      const row = await prisma.project.findUnique({ where: { userId: user.id } });
      const sheetUrl = row && row.sheetUrl ? String(row.sheetUrl).trim() : "";
      return res.json({ ok: true, sheetUrl: sheetUrl || "" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      return res.status(500).json({ ok: false, error: msg });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const raw = body.sheetUrl != null ? String(body.sheetUrl) : "";
      const trimmed = raw.trim();

      let finalUrl = "";
      let csvNormalized = false;
      if (trimmed) {
        try {
          const { csvUrl, wasTransformed } = normalizeGoogleSheetsInputToCsvUrl(trimmed);
          finalUrl = csvUrl;
          csvNormalized = wasTransformed;
        } catch (e) {
          return res.status(400).json({
            ok: false,
            code: e.code || "INVALID_URL",
            error: e.message || "Неверный URL",
          });
        }
      }

      await prisma.project.upsert({
        where: { userId: user.id },
        create: { userId: user.id, sheetUrl: finalUrl },
        update: { sheetUrl: finalUrl },
      });
      return res.json({
        ok: true,
        success: true,
        sheetUrl: finalUrl,
        csvNormalized,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка сохранения";
      return res.status(500).json({ ok: false, error: msg });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "Method Not Allowed" });
};
