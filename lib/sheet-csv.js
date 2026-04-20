/**
 * Строгая разборка Google Sheets CSV: latitude, longitude, status, name, address.
 * Режимы: по заголовкам (если найдены все 5 полей) или по фиксированным индексам 0–4.
 */

const { resolveStatusKey, statusMetaForKey, makePointKey } = require("./map-statuses");

function normalizeHeaderCell(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

const HEADER_SYNONYMS = {
  latitude: new Set(["latitude", "lat", "широта"]),
  longitude: new Set(["longitude", "long", "lon", "lng", "долгота"]),
  status: new Set(["status", "статус", "state"]),
  name: new Set(["name", "title", "название", "имя"]),
  address: new Set(["address", "addr", "адрес", "location"]),
};

function parseCoordinateValue(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const n = Number(normalized);
  return n;
}

function detectHeaderMapping(headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const norm = normalizeHeaderCell(headerRow[i]);
    for (const field of Object.keys(HEADER_SYNONYMS)) {
      if (map[field] !== undefined) {
        continue;
      }
      if (HEADER_SYNONYMS[field].has(norm)) {
        map[field] = i;
        break;
      }
    }
  }
  const complete =
    map.latitude !== undefined &&
    map.longitude !== undefined &&
    map.status !== undefined &&
    map.name !== undefined &&
    map.address !== undefined;
  return complete ? map : null;
}

const INDEX_FALLBACK = {
  latitude: 0,
  longitude: 1,
  status: 2,
  name: 3,
  address: 4,
};

function coordsInRange(lat, lon) {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * @param {string[][]} rows — уже разобранные строки CSV (без пустых строк)
 * @returns {{ ok: true, points: object[], mode: string } | { ok: false, code: string, error: string, details: string[] }}
 */
function buildPointsFromCsvRows(rows) {
  const details = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      code: "EMPTY_CSV",
      error: "Неверный формат таблицы",
      details: ["Нет ни одной строки с данными"],
    };
  }

  let dataRows;
  /** @type {Record<string, number>} */
  let indices;
  let mode;

  const first = rows[0];
  const mapping = detectHeaderMapping(first);

  if (mapping) {
    indices = mapping;
    dataRows = rows.slice(1);
    mode = "header";
  } else {
    indices = { ...INDEX_FALLBACK };
    dataRows = rows;
    mode = "index";
  }

  if (mode === "header" && dataRows.length === 0) {
    return {
      ok: false,
      code: "INVALID_SCHEMA",
      error: "Неверный формат таблицы",
      details: ["После строки заголовка нет данных"],
    };
  }

  const maxIdx = Math.max(
    indices.latitude,
    indices.longitude,
    indices.status,
    indices.name,
    indices.address
  );

  const points = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const lineNumber = i + (mode === "header" ? 2 : 1);

    if (row.length <= maxIdx) {
      details.push(`Строка ${lineNumber}: недостаточно колонок (ожидается минимум ${maxIdx + 1})`);
      continue;
    }

    const lat = parseCoordinateValue(row[indices.latitude]);
    const lon = parseCoordinateValue(row[indices.longitude]);
    const sheetStatus = String(row[indices.status] ?? "").trim();
    const nameCell = String(row[indices.name] ?? "").trim();
    const address = String(row[indices.address] ?? "").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      details.push(`Строка ${lineNumber}: широта и долгота должны быть числами`);
      continue;
    }
    if (!coordsInRange(lat, lon)) {
      details.push(`Строка ${lineNumber}: координаты вне допустимого диапазона`);
      continue;
    }
    if (!sheetStatus) {
      details.push(`Строка ${lineNumber}: статус не может быть пустым`);
      continue;
    }

    const name = nameCell || `Точка ${lineNumber}`;
    /** Колонки F и G листа (индексы 5 и 6 в строке CSV), независимо от режима заголовков A–E. */
    const columnF = String(row[5] ?? "").trim() || undefined;
    const columnG = String(row[6] ?? "").trim() || undefined;

    const key = makePointKey(lat, lon, name);
    const statusKey = resolveStatusKey(sheetStatus);
    const meta = statusMetaForKey(statusKey);

    points.push({
      name,
      lat,
      lon,
      address,
      columnF,
      columnG,
      key,
      statusKey,
      statusName: meta.name,
      sheetStatus,
    });
  }

  if (points.length === 0) {
    return {
      ok: false,
      code: "NO_VALID_ROWS",
      error: "Неверный формат таблицы",
      details:
        details.length > 0
          ? details.slice(0, 25)
          : ["Нет ни одной строки с корректными координатами и непустым статусом"],
    };
  }

  return { ok: true, points, mode, skippedHints: details.slice(0, 15) };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvToRows(csvText) {
  return csvText
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => parseCsvLine(line));
}

/**
 * Разрешить только экспорт CSV Google Таблиц (защита от SSRF).
 * @param {string} raw
 */
function assertAllowedGoogleSheetsCsvUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    throw Object.assign(new Error("Пустой URL"), { code: "INVALID_URL" });
  }
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    throw Object.assign(new Error("Некорректный URL"), { code: "INVALID_URL" });
  }
  if (u.protocol !== "https:") {
    throw Object.assign(new Error("Разрешён только https"), { code: "INVALID_URL" });
  }
  if (u.hostname !== "docs.google.com") {
    throw Object.assign(new Error("Разрешены только ссылки docs.google.com"), { code: "INVALID_URL" });
  }
  if (!/\/spreadsheets\/d\/[a-zA-Z0-9_-]+\//.test(u.pathname)) {
    throw Object.assign(new Error("Ожидается ссылка на Google Таблицу"), { code: "INVALID_URL" });
  }
  if (!u.pathname.includes("/export")) {
    throw Object.assign(
      new Error('Используйте ссылку экспорта CSV (…/export?format=csv&gid=…)'),
      { code: "INVALID_URL" }
    );
  }
  const format = u.searchParams.get("format");
  if (!format || format.toLowerCase() !== "csv") {
    throw Object.assign(new Error("В URL должен быть параметр format=csv"), { code: "INVALID_URL" });
  }
  return u.toString();
}

const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

/**
 * Принимает любую https-ссылку на docs.google.com/spreadsheets/d/…
 * (в т.ч. /edit?gid=…) и возвращает канонический URL экспорта CSV + флаг «была ли замена».
 */
function normalizeGoogleSheetsInputToCsvUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    throw Object.assign(new Error("Пустой URL"), { code: "INVALID_URL" });
  }

  let u;
  try {
    u = new URL(trimmed);
  } catch {
    throw Object.assign(new Error("Неверная ссылка"), { code: "INVALID_URL" });
  }

  if (u.protocol !== "https:") {
    throw Object.assign(new Error("Неверная ссылка"), { code: "INVALID_URL" });
  }
  if (u.hostname !== "docs.google.com") {
    throw Object.assign(new Error("Неверная ссылка"), { code: "INVALID_URL" });
  }

  const idMatch = u.pathname.match(SHEET_ID_RE);
  if (!idMatch) {
    throw Object.assign(new Error("Неверная ссылка"), { code: "INVALID_URL" });
  }
  const spreadsheetId = idMatch[1];

  const formatParam = u.searchParams.get("format");
  const alreadyCsvExport =
    u.pathname.includes("/export") && formatParam && formatParam.toLowerCase() === "csv";

  if (alreadyCsvExport) {
    const csvUrl = assertAllowedGoogleSheetsCsvUrl(trimmed);
    return { csvUrl, wasTransformed: false };
  }

  let gid = "0";
  const qp = u.searchParams.get("gid");
  if (qp != null && String(qp).trim() !== "") {
    const digits = String(qp).replace(/\D/g, "");
    gid = digits === "" ? "0" : digits;
  } else if (u.hash) {
    const hm = /[#&?]gid=(\d+)/i.exec(u.hash);
    if (hm) {
      gid = hm[1];
    }
  }

  const built = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const csvUrl = assertAllowedGoogleSheetsCsvUrl(built);
  return { csvUrl, wasTransformed: true };
}

module.exports = {
  buildPointsFromCsvRows,
  parseCsvToRows,
  parseCsvLine,
  parseCoordinateValue,
  assertAllowedGoogleSheetsCsvUrl,
  normalizeGoogleSheetsInputToCsvUrl,
};
