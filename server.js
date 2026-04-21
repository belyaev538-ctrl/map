const path = require("path");
const express = require("express");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("REJECTION:", reason);
});

process.on("exit", (code) => {
  console.log(`Process exit event, code=${code}`);
});

const dotenv = require("dotenv");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./lib/prisma");
const { MAP_STATUSES } = require("./lib/map-statuses");
const {
  normalizeGoogleSheetsInputToCsvUrl,
  buildPointsFromCsvRows,
  parseCsvToRows,
} = require("./lib/sheet-csv");
const {
  EMAIL_RE,
  hashPassword,
  verifyPassword,
  signUserToken,
  getBearerUser,
} = require("./lib/map-auth");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicRoot = path.join(__dirname, "public");

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/babysit", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

app.use(express.json({ limit: "256kb" }));

app.get("/app", (_req, res) => {
  res.sendFile(path.join(publicRoot, "index.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicRoot, "login.html"));
});

app.get("/register", (_req, res) => {
  res.sendFile(path.join(publicRoot, "register.html"));
});

app.use(express.static(publicRoot));

function attachUserOr401(req, res) {
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
  req.user = user;
  return user;
}

/** Все /api/* только с JWT, кроме POST /api/register и POST /api/login */
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }
  const publicAuth =
    req.method === "POST" && (req.path === "/api/register" || req.path === "/api/login");
  if (publicAuth) {
    return next();
  }
  if (!attachUserOr401(req, res)) {
    return;
  }
  return next();
});

app.get("/api/config", (_req, res) => {
  res.json({
    yandexApiKey: process.env.YANDEX_MAPS_API_KEY || "",
    mapStatuses: MAP_STATUSES,
  });
});

/** Профиль по JWT + актуальные данные из БД */
app.get("/api/me", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true },
    });
    if (!user) {
      return res.status(401).json({
        ok: false,
        code: "UNAUTHORIZED",
        error: "Пользователь не найден",
        details: [],
      });
    }
    return res.json({ ok: true, user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.post("/api/register", async (req, res) => {
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
});

app.post("/api/login", async (req, res) => {
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
});

app.get("/api/project", async (req, res) => {
  try {
    const row = await prisma.project.findUnique({ where: { userId: req.user.id } });
    const sheetUrl = row && row.sheetUrl ? String(row.sheetUrl).trim() : "";
    return res.json({ ok: true, sheetUrl: sheetUrl || "" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.post("/api/project", async (req, res) => {
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
      where: { userId: req.user.id },
      create: { userId: req.user.id, sheetUrl: finalUrl },
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
});

async function handlePointsRequest(req, res) {
  const user = req.user;

  const q = req.query || {};
  if (
    q.csvUrl != null ||
    q.url != null ||
    q.sheetUrl != null ||
    q.csv != null
  ) {
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

  const payload = {
    ok: true,
    points: result.points,
    mapStatuses: MAP_STATUSES,
    parseMode: result.mode,
  };
  try {
    const body = JSON.stringify(payload);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      ok: false,
      code: "JSON_SERIALIZE_ERROR",
      error: "Не удалось сформировать ответ (слишком большая или некорректная таблица)",
      details: [msg],
    });
  }
}

app.get("/api/points", handlePointsRequest);
app.post("/api/points", handlePointsRequest);

async function fetchCsvData(csvUrl) {
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}. Проверьте, что таблица доступна по ссылке (Viewer) и URL — экспорт CSV (…/export?format=csv&gid=…).`
    );
  }
  return response.text();
}

console.log("Starting server...");
console.log("ENV PORT:", process.env.PORT);
console.log("FINAL PORT:", PORT);

if (!process.env.DATABASE_URL) {
  console.error("Предупреждение: DATABASE_URL не задан — запросы к БД недоступны до настройки.");
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "Предупреждение: JWT_SECRET не задан или короче 16 символов — вход/API с токеном не будут работать."
  );
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Порт ${PORT} занят:`, err.message || err);
  } else {
    console.error("HTTP server error:", err);
  }
});

function shutdown(signal) {
  console.log(`${signal}: graceful shutdown (HTTP → Prisma disconnect)`);
  process.exitCode = 0;
  server.close((closeErr) => {
    if (closeErr) {
      console.error("server.close:", closeErr);
    }
    void prisma
      .$disconnect()
      .catch((e) => console.error("prisma.$disconnect:", e))
      .finally(() => process.exit(0));
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

void prisma
  .$connect()
  .then(() => {
    console.log("DB connected");
    console.log("Startup complete.");
  })
  .catch((e) => {
    console.error("Prisma: не удалось подключиться к базе (повтор при запросах):", e);
  });
