/**
 * Единый справочник статусов карты: отображаемое имя → цвет маркера и метаданные.
 * Цвета только здесь (не из .env).
 */

const STATUS_COLORS = {
  Посетить: "#2563EB",
  Посетил: "#60A5FA",
  "Нет ЛПР": "#F59E0B",
  Отказ: "#EF4444",
  Интересно: "#84CC16",
  "Готов платить": "#16A34A",
  "Посетить еще раз": "#1D4ED8",
};

const STATUS_COLOR_FALLBACK = "#6B7280";

const MAP_STATUS_DEFS = [
  ["visit", "Посетить"],
  ["visited", "Посетил"],
  ["no_lpr", "Нет ЛПР"],
  ["refusal", "Отказ"],
  ["interesting", "Интересно"],
  ["ready_to_pay", "Готов платить"],
  ["visit_again", "Посетить еще раз"],
];

const MAP_STATUSES = MAP_STATUS_DEFS.map(([key, name]) => ({
  key,
  name,
  color: STATUS_COLORS[name] ?? STATUS_COLOR_FALLBACK,
}));

const STATUS_BY_KEY = new Map(MAP_STATUSES.map((s) => [s.key, s]));

function normalizeStatusLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е");
}

/** Доп. варианты из таблиц (синонимы → key). */
const ALIAS_TO_KEY = new Map([
  ["нет - лпр", "no_lpr"],
  ["нет лпр", "no_lpr"],
  ["нетlpr", "no_lpr"],
  ["посетить ещё раз", "visit_again"],
  ["посетить еще раз", "visit_again"],
]);

function resolveStatusKey(rawStatus) {
  const trimmed = String(rawStatus || "").trim();
  if (!trimmed) {
    return "other";
  }

  const norm = normalizeStatusLabel(trimmed);
  if (ALIAS_TO_KEY.has(norm)) {
    return ALIAS_TO_KEY.get(norm);
  }

  for (let i = 0; i < MAP_STATUSES.length; i += 1) {
    const s = MAP_STATUSES[i];
    if (s.name === trimmed) {
      return s.key;
    }
    if (normalizeStatusLabel(s.name) === norm) {
      return s.key;
    }
  }

  return "other";
}

function statusMetaForKey(statusKey) {
  if (statusKey === "other" || !STATUS_BY_KEY.has(statusKey)) {
    return { key: "other", name: "Прочие", color: STATUS_COLOR_FALLBACK };
  }
  return STATUS_BY_KEY.get(statusKey);
}

/** Цвет маркера по отображаемому имени статуса (как в UI / API `status`). */
function colorForStatusName(displayName) {
  const trimmed = String(displayName ?? "").trim();
  if (Object.prototype.hasOwnProperty.call(STATUS_COLORS, trimmed)) {
    return STATUS_COLORS[trimmed];
  }
  const norm = normalizeStatusLabel(trimmed);
  for (const name of Object.keys(STATUS_COLORS)) {
    if (normalizeStatusLabel(name) === norm) {
      return STATUS_COLORS[name];
    }
  }
  return STATUS_COLOR_FALLBACK;
}

function makePointKey(lat, lon, name) {
  const la = Number(lat);
  const lo = Number(lon);
  return `${la.toFixed(6)}|${lo.toFixed(6)}|${String(name || "").trim()}`;
}

/** Строки для Prisma seed (цвета из STATUS_COLORS). */
function getStatusSeedRows() {
  return MAP_STATUSES.map((s, i) => ({
    key: s.key,
    name: s.name,
    color: s.color,
    sortOrder: (i + 1) * 10,
  }));
}

module.exports = {
  STATUS_COLORS,
  STATUS_COLOR_FALLBACK,
  MAP_STATUSES,
  STATUS_BY_KEY,
  normalizeStatusLabel,
  resolveStatusKey,
  statusMetaForKey,
  colorForStatusName,
  makePointKey,
  getStatusSeedRows,
};
