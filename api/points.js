const { prisma } = require("../lib/prisma");
const { MAP_STATUSES } = require("../lib/map-statuses");
const { getBearerUser } = require("../lib/map-auth");
const {
  normalizeGoogleSheetsInputToCsvUrl,
  buildPointsFromCsvRows,
  parseCsvToRows,
} = require("../lib/sheet-csv");

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

async function fetchCsvData(csvUrl) {
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}. Проверьте, что таблица доступна по ссылке (Viewer) и URL — экспорт CSV (…/export?format=csv&gid=…).`
    );
  }
  return response.text();
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const user = getUserOr401(req, res);
  if (!user) {
    return;
  }

  const q = req.query || {};
  if (q.csvUrl != null || q.url != null || q.sheetUrl != null || q.csv != null) {
    const hasValue = ["csvUrl", "url", "sheetUrl", "csv"].some((k) => {
      const v = q[k];
      return v != null && String(v).trim() !== "";
    });
    if (hasValue) {
      return res.status(400).json({
        ok: false,
        code: "QUERY_NOT_ALLOWED",
        error: "Ссылка на таблицу хранится в базе (кабинет → Сохранить), параметры URL не используются",
        details: [],
      });
    }
  }

  let row;
  try {
    row = await prisma.project.findUnique({ where: { userId: user.id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, code: "DB_ERROR", error: msg, details: [] });
  }

  if (!row) {
    return res.status(400).json({
      ok: false,
      code: "NO_PROJECT",
      error: "Добавьте таблицу",
      details: [],
    });
  }

  const rawUrl = row.sheetUrl ? String(row.sheetUrl).trim() : "";
  if (!rawUrl) {
    return res.status(400).json({
      ok: false,
      code: "NO_SHEET_URL",
      error: "Добавьте таблицу",
      details: [],
    });
  }

  let csvUrl;
  try {
    const { csvUrl: resolved } = normalizeGoogleSheetsInputToCsvUrl(rawUrl);
    csvUrl = resolved;
  } catch (e) {
    return res.status(400).json({
      ok: false,
      code: e.code || "INVALID_URL",
      error: e.message || "Неверный URL в базе",
      details: [],
    });
  }

  let csvText;
  try {
    csvText = await fetchCsvData(csvUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({
      ok: false,
      code: "FETCH_FAILED",
      error: "Таблица недоступна",
      details: [msg],
    });
  }

  let rows;
  try {
    rows = parseCsvToRows(csvText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(400).json({
      ok: false,
      code: "BROKEN_CSV",
      error: "Неверный формат таблицы",
      details: [msg],
    });
  }

  const result = buildPointsFromCsvRows(rows);
  if (!result.ok) {
    return res.status(400).json({
      ok: false,
      code: result.code,
      error: result.error,
      details: result.details,
    });
  }

  return res.json({
    ok: true,
    points: result.points,
    mapStatuses: MAP_STATUSES,
    parseMode: result.mode,
  });
};
