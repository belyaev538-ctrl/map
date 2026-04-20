const LS_JWT_KEY = "sheet_map_jwt_v1";
const LS_EMAIL_KEY = "sheet_map_email_v1";

/**
 * Размер SVG-иконки (сторона квадрата), px.
 * Внутренний радиус заливки = BASE_MARKER_PX/2 − 2 (обводка) → при 18 даёт ~7px радиус.
 */
const BASE_MARKER_PX = 18;
const MARKER_HOVER_SCALE = 1.1;
const MARKER_ACTIVE_SCALE = 1.2;
const MARKER_FALLBACK_COLOR = "#6B7280";

const ALIAS_TO_KEY = new Map([
  ["нет - лпр", "no_lpr"],
  ["нет лпр", "no_lpr"],
  ["нетlpr", "no_lpr"],
  ["посетить ещё раз", "visit_again"],
  ["посетить еще раз", "visit_again"],
]);

function normalizeStatusLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е");
}

function defaultMapStatuses() {
  return [
    { key: "visit", name: "Посетить", color: "#2563EB" },
    { key: "visited", name: "Посетил", color: "#60A5FA" },
    { key: "no_lpr", name: "Нет ЛПР", color: "#F59E0B" },
    { key: "refusal", name: "Отказ", color: "#EF4444" },
    { key: "interesting", name: "Интересно", color: "#84CC16" },
    { key: "ready_to_pay", name: "Готов платить", color: "#16A34A" },
    { key: "visit_again", name: "Посетить еще раз", color: "#1D4ED8" },
  ];
}

function statusByKey(mapStatuses) {
  return new Map(mapStatuses.map((s) => [s.key, s]));
}

function resolveClientStatusKey(rawStatus, mapStatuses) {
  const trimmed = String(rawStatus || "").trim();
  if (!trimmed) {
    return "other";
  }
  const norm = normalizeStatusLabel(trimmed);
  if (ALIAS_TO_KEY.has(norm)) {
    return ALIAS_TO_KEY.get(norm);
  }
  const byKey = statusByKey(mapStatuses);
  for (let i = 0; i < mapStatuses.length; i += 1) {
    const s = mapStatuses[i];
    if (s.name === trimmed || normalizeStatusLabel(s.name) === norm) {
      return s.key;
    }
  }
  if (byKey.has(trimmed)) {
    return trimmed;
  }
  return "other";
}

function metaForKey(mapStatuses, statusKey) {
  const byKey = statusByKey(mapStatuses);
  if (statusKey === "other" || !byKey.has(statusKey)) {
    return { key: "other", name: "Прочие", color: MARKER_FALLBACK_COLOR };
  }
  return byKey.get(statusKey);
}

function makePointKey(lat, lon, name) {
  const la = Number(lat);
  const lo = Number(lon);
  return `${la.toFixed(6)}|${lo.toFixed(6)}|${String(name || "").trim()}`;
}

function normalizeLoadedPoints(rawPoints, mapStatuses) {
  return rawPoints.map((p, idx) => {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    const name = String(p.name || `point-${idx + 1}`).trim() || `point-${idx + 1}`;
    const address = String(p.address || "").trim();
    const columnF = String(p.columnF ?? "").trim();
    const columnG = String(p.columnG ?? "").trim();
    const key = p.key || makePointKey(lat, lon, name);
    const sheetOrLabel = p.sheetStatus != null ? p.sheetStatus : p.status;
    const statusKey =
      p.statusKey ||
      resolveClientStatusKey(sheetOrLabel != null ? sheetOrLabel : p.statusName, mapStatuses);
    const meta = metaForKey(mapStatuses, statusKey);
    return {
      name,
      lat,
      lon,
      address,
      columnF: columnF || undefined,
      columnG: columnG || undefined,
      key,
      statusKey,
      statusName: meta.name,
    };
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markerSizePxForState(statusKey, hovered, active) {
  const base = BASE_MARKER_PX;
  if (active) {
    return Math.round(base * MARKER_ACTIVE_SCALE);
  }
  if (hovered) {
    return Math.round(base * MARKER_HOVER_SCALE);
  }
  return base;
}

function createCircleIconHref(color, sizePx) {
  const fill = color || MARKER_FALLBACK_COLOR;
  const strokeW = 2;
  const r = sizePx / 2 - strokeW;
  const c = sizePx / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}"><circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" fill-opacity="1" stroke="#ffffff" stroke-width="${strokeW}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function balloonSheetExtra(label, value) {
  const v = String(value || "").trim();
  if (!v) {
    return "";
  }
  const body = escapeHtml(v).replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "<br/>");
  return `<div class="map-balloon__extra"><span class="map-balloon__label">${escapeHtml(label)}</span><div class="map-balloon__extra-value">${body}</div></div>`;
}

function buildBalloonBody(point, mapStatuses) {
  const statusText = escapeHtml(
    String(point.statusName || metaForKey(mapStatuses, point.statusKey).name || "").trim() || "—"
  );
  const addr = point.address
    ? `<div class="map-balloon__row">${escapeHtml(point.address)}</div>`
    : "";
  const colF = balloonSheetExtra("F", point.columnF);
  const colG = balloonSheetExtra("G", point.columnG);
  return `<div class="map-balloon">${addr}${colF}${colG}<div class="map-balloon__row map-balloon__status"><span class="map-balloon__label">Статус</span><span class="map-balloon__value">${statusText}</span></div></div>`;
}

let mapInstance = null;

function destroyMapInstance() {
  if (mapInstance) {
    try {
      mapInstance.destroy();
    } catch (_) {
      /* ignore */
    }
    mapInstance = null;
  }
}

function el(id) {
  return document.getElementById(id);
}

/** @param {string} text @param {"error"|"success"|"neutral"} [kind] */
function setCabinetMessage(text, kind = "neutral") {
  const msg = el("cabinet-message");
  if (!msg) {
    return;
  }
  const base = "mb-5 rounded-xl border px-4 py-3 text-sm";
  if (!text) {
    msg.textContent = "";
    msg.className = `${base} hidden`;
    return;
  }
  const variant =
    kind === "error"
      ? " border-red-200 bg-red-50 text-red-800"
      : kind === "success"
        ? " border-emerald-200 bg-emerald-50 text-emerald-900"
        : " border-slate-200 bg-slate-50 text-slate-700";
  msg.textContent = text;
  msg.className = base + variant;
}

function getToken() {
  return localStorage.getItem(LS_JWT_KEY) || "";
}

function setToken(token) {
  if (token) {
    localStorage.setItem(LS_JWT_KEY, token);
  } else {
    localStorage.removeItem(LS_JWT_KEY);
    localStorage.removeItem(LS_EMAIL_KEY);
  }
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function initCabinetUi() {
  const email = localStorage.getItem(LS_EMAIL_KEY) || "";
  const node = el("user-email-display");
  if (node) {
    node.textContent = email;
    node.setAttribute("title", email);
  }
}

function openMapView() {
  el("dashboard-view")?.classList.add("hidden");
  el("map-view")?.classList.remove("hidden");
  void runLoadCycle();
}

function closeMapView() {
  const searchInp = el("map-search-input");
  if (searchInp) {
    searchInp.value = "";
  }
  el("map-view")?.classList.add("hidden");
  el("dashboard-view")?.classList.remove("hidden");
  destroyMapInstance();
  setHidden(el("map-wrap"), true);
  hideErrorState();
  hideEmptyState();
}

function setupMapShell() {
  el("btn-open-map")?.addEventListener("click", () => {
    openMapView();
  });
  el("btn-close-map")?.addEventListener("click", () => {
    closeMapView();
  });
}

function redirectToLogin() {
  setToken("");
  window.location.replace("/login");
}

function ensureLoggedIn() {
  if (!getToken()) {
    window.location.replace("/login");
    return false;
  }
  return true;
}

/** Показывает подсказку: обычная ссылка на таблицу будет преобразована в экспорт CSV на сервере. */
function willNormalizeSheetUrlToCsv(raw) {
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== "https:" || u.hostname !== "docs.google.com") {
      return false;
    }
    if (!/\/spreadsheets\/d\/[a-zA-Z0-9_-]+/.test(u.pathname)) {
      return false;
    }
    const fmt = u.searchParams.get("format");
    const isCsvExport =
      u.pathname.includes("/export") && fmt && fmt.toLowerCase() === "csv";
    return !isCsvExport;
  } catch {
    return false;
  }
}

function updateSheetUrlNormalizeHint() {
  const hint = el("sheet-url-hint");
  const input = el("sheet-url-input");
  if (!hint || !input) {
    return;
  }
  const show = willNormalizeSheetUrlToCsv(input.value);
  hint.classList.toggle("hidden", !show);
}

function truncateUrl(s, max) {
  const lim = max || 64;
  const t = String(s || "");
  if (t.length <= lim) {
    return t;
  }
  return `${t.slice(0, lim - 1)}…`;
}

function syncSheetPanels(sheetUrl) {
  const savedRow = el("sheet-saved-row");
  const editRow = el("sheet-edit-row");
  const link = el("saved-url-link");
  const has = Boolean(sheetUrl && String(sheetUrl).trim());
  if (has) {
    savedRow?.classList.remove("hidden");
    editRow?.classList.add("hidden");
    if (link) {
      const u = String(sheetUrl).trim();
      link.href = u;
      link.textContent = truncateUrl(u, 72);
    }
  } else {
    savedRow?.classList.add("hidden");
    editRow?.classList.remove("hidden");
    if (link) {
      link.removeAttribute("href");
      link.textContent = "";
    }
  }
}

function enterReplaceMode() {
  el("sheet-saved-row")?.classList.add("hidden");
  el("sheet-edit-row")?.classList.remove("hidden");
  const input = el("sheet-url-input");
  if (input) {
    input.value = "";
    input.focus();
  }
  updateSheetUrlNormalizeHint();
}

async function refreshSheetUiFromServer() {
  const u = await fetchProjectSheetUrl();
  syncSheetPanels(u);
  return u;
}

async function fetchProjectSheetUrl() {
  const res = await fetch("/api/project", {
    headers: { ...authHeaders(), Accept: "application/json" },
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (res.status === 401) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Не удалось загрузить проект");
  }
  return typeof data.sheetUrl === "string" ? data.sheetUrl : data.sheetUrl === null ? "" : "";
}

function explainNonJsonApiBody(rawText) {
  const r = String(rawText ?? "");
  const t = r.trim();
  const hints = [];
  if (t.startsWith("<")) {
    hints.push(
      "Пришёл HTML (часто страница ошибки прокси или хостинга), а не JSON от /api/points."
    );
  } else if (t.length > 0 && !t.startsWith("{") && !t.startsWith("[") && t.includes(",")) {
    const firstLine = t.split(/\r?\n/, 1)[0] || "";
    if (/lat|lon|lng|latitude|longitude|широт|долгот/i.test(firstLine)) {
      hints.push(
        "Похоже на CSV: запрос должен идти на ваш сервер (/api/points), он сам качает таблицу. В кабинете укажите ссылку на Google Таблицу (обычную или экспорт CSV) и нажмите «Сохранить»."
      );
    }
  }
  if ((t.startsWith("{") || t.startsWith("[")) && t.length > 0) {
    hints.push(
      "JSON выглядит обрезанным или повреждённым — попробуйте уменьшить таблицу или повторить загрузку."
    );
  }
  if (hints.length === 0) {
    hints.push("Ожидался JSON от приложения; проверьте логи сервера и сеть.");
  }
  const preview = r.replace(/\s+/g, " ").slice(0, 220);
  if (preview) {
    hints.push(`Начало ответа: ${preview}${r.length > 220 ? "…" : ""}`);
  }
  return hints;
}

function setHidden(node, hidden) {
  if (!node) {
    return;
  }
  if (hidden) {
    node.classList.add("hidden");
  } else {
    node.classList.remove("hidden");
  }
}

function showLoader(show) {
  setHidden(el("app-loader"), !show);
}

function showErrorState(message, details) {
  setHidden(el("app-error"), false);
  setHidden(el("app-empty"), true);
  const title = el("app-error-title");
  const list = el("app-error-details");
  if (title) {
    title.textContent = message || "Ошибка";
  }
  if (list) {
    list.innerHTML = "";
    const items = Array.isArray(details) ? details : [];
    if (items.length) {
      const ul = document.createElement("ul");
      items.slice(0, 20).forEach((t) => {
        const li = document.createElement("li");
        li.textContent = String(t);
        ul.appendChild(li);
      });
      list.appendChild(ul);
    }
  }
  setHidden(el("map-wrap"), true);
  destroyMapInstance();
}

function hideErrorState() {
  setHidden(el("app-error"), true);
  const list = el("app-error-details");
  if (list) {
    list.innerHTML = "";
  }
}

function showEmptyState(message) {
  setHidden(el("app-empty"), false);
  const p = el("app-empty-text");
  if (p) {
    p.textContent = message;
  }
  setHidden(el("app-error"), true);
  setHidden(el("map-wrap"), true);
  destroyMapInstance();
}

/**
 * Нет URL таблицы — возвращаем в кабинет и показываем подсказку у поля ввода,
 * без полноэкранного #app-empty (он перекрывал форму «Ваша таблица»).
 */
function guideAddSheetUrl(message) {
  showLoader(false);
  hideEmptyState();
  hideErrorState();
  closeMapView();
  syncSheetPanels("");
  const text =
    message ||
    "Вставьте ссылку на Google Таблицу (обычную из браузера или экспорт CSV) и нажмите «Сохранить».";
  setCabinetMessage(text, "error");
  window.requestAnimationFrame(() => {
    const inp = el("sheet-url-input");
    if (inp) {
      inp.focus();
      inp.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

/** Ссылка уже есть — возвращаем в кабинет с подсказкой, без полного экрана поверх формы */
function guideCabinetSheetIssue(message, sheetUrlToShow) {
  showLoader(false);
  hideEmptyState();
  hideErrorState();
  closeMapView();
  const raw = sheetUrlToShow ? String(sheetUrlToShow).trim() : "";
  syncSheetPanels(raw || "");
  if (raw) {
    el("sheet-saved-row")?.classList.add("hidden");
    el("sheet-edit-row")?.classList.remove("hidden");
    const inpFill = el("sheet-url-input");
    if (inpFill) {
      inpFill.value = raw;
    }
  }
  setCabinetMessage(message, "error");
  window.requestAnimationFrame(() => {
    const inp = el("sheet-url-input");
    if (inp) {
      inp.focus();
      inp.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function hideEmptyState() {
  setHidden(el("app-empty"), true);
}

function fillFixedLegend(mapStatuses) {
  const legend = el("map-legend");
  if (!legend) {
    return;
  }
  legend.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "map-legend-inner";
  mapStatuses.forEach((s) => {
    const item = document.createElement("span");
    item.className = "map-legend-item";
    const dot = document.createElement("span");
    dot.className = "map-legend-dot";
    dot.style.backgroundColor = s.color;
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = s.name;
    item.appendChild(dot);
    item.appendChild(label);
    wrap.appendChild(item);
  });
  const other = document.createElement("span");
  other.className = "map-legend-item";
  const od = document.createElement("span");
  od.className = "map-legend-dot";
  od.style.backgroundColor = MARKER_FALLBACK_COLOR;
  od.setAttribute("aria-hidden", "true");
  const ot = document.createElement("span");
  ot.textContent = "Прочие";
  other.appendChild(od);
  other.appendChild(ot);
  wrap.appendChild(other);
  legend.appendChild(wrap);
}

async function fetchPointsFromServer() {
  return fetch("/api/points", {
    headers: { ...authHeaders(), Accept: "application/json" },
  });
}

function loadYandexMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.ymaps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    const keyPart = apiKey ? `&apikey=${encodeURIComponent(apiKey)}` : "";
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${keyPart}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));

    document.head.appendChild(script);
  });
}

function buildMapWithPoints(points, mapStatuses) {
  const summaryNode = el("summary");
  const legendNode = el("legend");

  const map = new ymaps.Map("map", {
    center: [55.751244, 37.618423],
    zoom: 9,
    controls: ["zoomControl", "typeSelector", "fullscreenControl"],
  });
  mapInstance = map;
  window.requestAnimationFrame(() => {
    try {
      map.container.fitToViewport();
    } catch (_) {
      /* размер контейнера мог быть 0 до показа слоя карты */
    }
  });

  map.setCenter([points[0].lat, points[0].lon], 10);

  const visibility = {};
  const OTHER_KEY = "other";
  mapStatuses.forEach((s) => {
    visibility[s.key] = true;
  });
  visibility[OTHER_KEY] = true;

  const allPlacemarks = points.map((point, index) => {
    let hovered = false;
    let balloonOpen = false;

    function currentMeta() {
      return metaForKey(mapStatuses, points[index].statusKey);
    }

    function refreshIcon() {
      const meta = currentMeta();
      const sk = points[index].statusKey;
      const sizePx = markerSizePxForState(sk, hovered, balloonOpen);
      placemark.options.set("iconImageHref", createCircleIconHref(meta.color, sizePx));
      placemark.options.set("iconImageSize", [sizePx, sizePx]);
      placemark.options.set("iconImageOffset", [-sizePx / 2, -sizePx / 2]);
    }

    const meta0 = metaForKey(mapStatuses, point.statusKey);
    const size0 = markerSizePxForState(point.statusKey, false, false);
    const placemark = new ymaps.Placemark(
      [point.lat, point.lon],
      {
        balloonContentHeader: escapeHtml(point.name),
        balloonContentBody: buildBalloonBody(point, mapStatuses),
      },
      {
        iconLayout: "default#image",
        iconImageHref: createCircleIconHref(meta0.color, size0),
        iconImageSize: [size0, size0],
        iconImageOffset: [-size0 / 2, -size0 / 2],
        balloonCloseButton: true,
        hideIconOnBalloonOpen: false,
      }
    );
    placemark.properties.set("filterKey", point.statusKey === "other" ? OTHER_KEY : point.statusKey);
    placemark.properties.set("pointIndex", index);

    placemark.events.add("mouseenter", () => {
      hovered = true;
      refreshIcon();
    });
    placemark.events.add("mouseleave", () => {
      hovered = false;
      refreshIcon();
    });
    placemark.events.add("balloonopen", () => {
      balloonOpen = true;
      refreshIcon();
    });
    placemark.events.add("balloonclose", () => {
      balloonOpen = false;
      refreshIcon();
    });

    return placemark;
  });

  const clusterToggle = el("cluster-toggle");

  function rebuildMapLayers() {
    map.geoObjects.removeAll();
    const clusterOn = clusterToggle && clusterToggle.checked;
    const q = (el("map-search-input")?.value || "").trim().toLowerCase();
    const visible = allPlacemarks.filter((pm) => {
      const idx = pm.properties.get("pointIndex");
      const name = String(points[idx]?.name || "").toLowerCase();
      const matchSearch = !q || name.includes(q);
      const key = pm.properties.get("filterKey");
      const allowed = key === OTHER_KEY ? visibility[OTHER_KEY] : visibility[key];
      return matchSearch && Boolean(allowed);
    });
    if (summaryNode) {
      summaryNode.textContent = `Всего точек: ${points.length} · на карте: ${visible.length}`;
    }
    if (visible.length === 0) {
      return;
    }
    if (clusterOn) {
      const clusterer = new ymaps.Clusterer({
        preset: "islands#invertedBlueClusterIcons",
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterHideIconOnBalloonOpen: false,
        gridSize: 72,
        clusterAnimationDuration: 0,
      });
      clusterer.add(visible);
      map.geoObjects.add(clusterer);
    } else {
      visible.forEach((pm) => map.geoObjects.add(pm));
    }
  }

  const legendInputs = {};

  function syncLegendChecks() {
    mapStatuses.forEach((s) => {
      const inp = legendInputs[s.key];
      if (inp) {
        inp.checked = Boolean(visibility[s.key]);
      }
    });
    if (legendInputs.other) {
      legendInputs.other.checked = Boolean(visibility[OTHER_KEY]);
    }
  }

  function setupLegendAndFilters() {
    if (!legendNode) {
      return;
    }
    legendNode.innerHTML = "";
    Object.keys(legendInputs).forEach((k) => delete legendInputs[k]);

    mapStatuses.forEach((s) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.className = "checkbox-label";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(visibility[s.key]);
      input.dataset.statusKey = s.key;
      input.addEventListener("change", () => {
        visibility[s.key] = input.checked;
        rebuildMapLayers();
      });
      legendInputs[s.key] = input;
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = s.color;
      const text = document.createElement("span");
      text.textContent = s.name;
      label.appendChild(input);
      label.appendChild(dot);
      label.appendChild(text);
      li.appendChild(label);
      legendNode.appendChild(li);
    });

    const liOther = document.createElement("li");
    const labelOther = document.createElement("label");
    labelOther.className = "checkbox-label";
    const inputOther = document.createElement("input");
    inputOther.type = "checkbox";
    inputOther.checked = Boolean(visibility[OTHER_KEY]);
    inputOther.addEventListener("change", () => {
      visibility[OTHER_KEY] = inputOther.checked;
      rebuildMapLayers();
    });
    legendInputs.other = inputOther;
    const dotOther = document.createElement("span");
    dotOther.className = "dot";
    dotOther.style.background = MARKER_FALLBACK_COLOR;
    const textOther = document.createElement("span");
    textOther.textContent = "Прочие";
    labelOther.appendChild(inputOther);
    labelOther.appendChild(dotOther);
    labelOther.appendChild(textOther);
    liOther.appendChild(labelOther);
    legendNode.appendChild(liOther);
  }

  setupLegendAndFilters();

  const searchInp = el("map-search-input");
  if (searchInp) {
    searchInp.addEventListener("input", () => {
      rebuildMapLayers();
    });
  }

  const btnReady = el("qf-ready-only");
  const btnHideRefusal = el("qf-hide-refusal");
  const btnReset = el("qf-reset");

  if (btnReady) {
    btnReady.addEventListener("click", () => {
      mapStatuses.forEach((s) => {
        visibility[s.key] = s.key === "ready_to_pay";
      });
      visibility[OTHER_KEY] = false;
      syncLegendChecks();
      rebuildMapLayers();
    });
  }
  if (btnHideRefusal) {
    btnHideRefusal.addEventListener("click", () => {
      visibility.refusal = false;
      syncLegendChecks();
      rebuildMapLayers();
    });
  }
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      mapStatuses.forEach((s) => {
        visibility[s.key] = true;
      });
      visibility[OTHER_KEY] = true;
      syncLegendChecks();
      rebuildMapLayers();
    });
  }

  if (clusterToggle) {
    clusterToggle.addEventListener("change", rebuildMapLayers);
  }
  rebuildMapLayers();
}

async function runLoadCycle() {
  hideErrorState();
  hideEmptyState();
  if (!getToken()) {
    redirectToLogin();
    return;
  }
  showLoader(true);

  let config;
  try {
    const configRes = await fetch("/api/config", {
      headers: { ...authHeaders(), Accept: "application/json" },
    });
    if (configRes.status === 401) {
      showLoader(false);
      redirectToLogin();
      return;
    }
    const configText = await configRes.text();
    try {
      config = configText ? JSON.parse(configText) : {};
    } catch {
      showLoader(false);
      showErrorState("Не удалось получить настройки (ответ не JSON)", explainNonJsonApiBody(configText));
      return;
    }
  } catch {
    showLoader(false);
    showErrorState("Не удалось получить настройки", ["Проверьте соединение и попробуйте снова"]);
    return;
  }

  const yandexApiKey = config.yandexApiKey || "";
  const mapStatuses = Array.isArray(config.mapStatuses) && config.mapStatuses.length
    ? config.mapStatuses
    : defaultMapStatuses();

  let urlFromServer = "";
  try {
    urlFromServer = await fetchProjectSheetUrl();
    syncSheetPanels(urlFromServer);
    if (!urlFromServer) {
      guideAddSheetUrl("Добавьте таблицу: вставьте ссылку на таблицу ниже и нажмите «Сохранить».");
      return;
    }
  } catch (e) {
    showLoader(false);
    if (e && e.status === 401) {
      redirectToLogin();
      return;
    }
    showErrorState(e instanceof Error ? e.message : "Ошибка проекта", []);
    return;
  }

  let pointsRes;
  let pointsRaw = "";
  try {
    pointsRes = await fetchPointsFromServer();
    pointsRaw = await pointsRes.text();
  } catch {
    showLoader(false);
    showErrorState("Сеть недоступна", []);
    return;
  }

  if (pointsRes.status === 401) {
    showLoader(false);
    redirectToLogin();
    return;
  }

  let data;
  try {
    data = pointsRaw.trim() ? JSON.parse(pointsRaw) : {};
  } catch {
    showLoader(false);
    showErrorState("Ответ сервера не JSON (возможно, обрыв CSV)", explainNonJsonApiBody(pointsRaw));
    return;
  }

  if (!pointsRes.ok) {
    showLoader(false);
    const code = data.code || "";
    if (code === "NO_SHEET_URL" || code === "NO_PROJECT") {
      syncSheetPanels("");
      guideAddSheetUrl("Добавьте таблицу: вставьте ссылку на таблицу ниже и нажмите «Сохранить».");
      return;
    }
    if (code === "NO_VALID_ROWS") {
      guideCabinetSheetIssue(
        "Нет строк с корректными координатами и статусом. Проверьте таблицу или замените ссылку ниже.",
        urlFromServer
      );
      return;
    }
    showErrorState(data.error || "Ошибка загрузки", data.details);
    return;
  }

  if (!data.ok) {
    showLoader(false);
    showErrorState(data.error || "Ошибка", data.details);
    return;
  }

  const rawPoints = data.points || [];
  const points = normalizeLoadedPoints(rawPoints, mapStatuses);

  if (points.length === 0) {
    guideCabinetSheetIssue(
      "После загрузки не осталось ни одной точки для карты. Проверьте столбцы и фильтры в таблице.",
      urlFromServer
    );
    return;
  }

  try {
    await loadYandexMaps(yandexApiKey);
    await ymaps.ready();
  } catch (e) {
    showLoader(false);
    showErrorState(e instanceof Error ? e.message : "Ошибка карт", []);
    return;
  }

  destroyMapInstance();
  setHidden(el("map-wrap"), false);
  fillFixedLegend(mapStatuses);

  showLoader(false);
  hideErrorState();
  hideEmptyState();

  buildMapWithPoints(points, mapStatuses);
}

function setupSheetPanel() {
  const saveBtn = el("sheet-save-btn");
  const replaceBtn = el("sheet-replace-btn");
  const input = el("sheet-url-input");
  const retryBtn = el("app-error-retry");
  const logoutBtn = el("logout-btn");

  logoutBtn?.addEventListener("click", () => {
    redirectToLogin();
  });

  if (input) {
    input.addEventListener("input", () => updateSheetUrlNormalizeHint());
    input.addEventListener("paste", () => window.setTimeout(() => updateSheetUrlNormalizeHint(), 0));
  }

  if (saveBtn && input) {
    saveBtn.addEventListener("click", async () => {
      if (!getToken()) {
        redirectToLogin();
        return;
      }
      const v = input.value.trim();
      try {
        const res = await fetch("/api/project", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ sheetUrl: v }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        if (!res.ok) {
          showErrorState(typeof data.error === "string" ? data.error : "Не сохранено", data.details || []);
          return;
        }
        const saved = typeof data.sheetUrl === "string" ? data.sheetUrl : v;
        syncSheetPanels(saved);
        setCabinetMessage("Сохранено.", "success");
        window.setTimeout(() => setCabinetMessage(""), 2000);
        const mapView = el("map-view");
        if (mapView && !mapView.classList.contains("hidden")) {
          void runLoadCycle();
        }
      } catch {
        showErrorState("Сеть недоступна", []);
      }
    });
  }

  replaceBtn?.addEventListener("click", () => {
    enterReplaceMode();
  });

  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      void runLoadCycle();
    });
  }

  const emptyRetry = el("app-empty-retry");
  if (emptyRetry) {
    emptyRetry.addEventListener("click", () => {
      void runLoadCycle();
    });
  }
}

function bootstrap() {
  if (!ensureLoggedIn()) {
    return;
  }
  initCabinetUi();
  setupSheetPanel();
  setupMapShell();
  void (async () => {
    try {
      await refreshSheetUiFromServer();
    } catch (e) {
      if (e && e.status === 401) {
        redirectToLogin();
        return;
      }
    }
  })();
}

bootstrap();
