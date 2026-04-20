const LS_JWT_KEY = "sheet_map_jwt_v1";
const LS_EMAIL_KEY = "sheet_map_email_v1";

function el(id) {
  return document.getElementById(id);
}

function clearFieldErrors() {
  ["login-email-error", "login-password-error", "login-field-errors", "login-message"].forEach((id) => {
    const n = el(id);
    if (!n) {
      return;
    }
    n.textContent = "";
    n.classList.add("hidden");
  });
}

function showUnderInput(field, text) {
  const map = { email: "login-email-error", password: "login-password-error" };
  const nid = map[field];
  const n = nid ? el(nid) : null;
  if (n && text) {
    n.textContent = text;
    n.classList.remove("hidden");
  }
}

function setBanner(text, kind) {
  const m = el("login-message");
  if (!m) {
    return;
  }
  if (!text) {
    m.textContent = "";
    m.classList.add("hidden");
    return;
  }
  m.textContent = text;
  m.classList.remove("hidden");
  m.className =
    "mb-5 rounded-xl border px-4 py-3 text-sm " +
    (kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-900");
}

function bootstrap() {
  if (localStorage.getItem(LS_JWT_KEY)) {
    window.location.replace("/");
    return;
  }

  el("login-submit")?.addEventListener("click", async () => {
    clearFieldErrors();
    const email = el("login-email")?.value.trim().toLowerCase() || "";
    const password = el("login-password")?.value || "";
    let hasErr = false;
    if (!email) {
      showUnderInput("email", "Введите email");
      hasErr = true;
    }
    if (!password) {
      showUnderInput("password", "Введите пароль");
      hasErr = true;
    }
    if (hasErr) {
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = typeof data.error === "string" ? data.error : "Ошибка входа";
        setBanner(err, "error");
        return;
      }
      if (typeof data.token === "string") {
        localStorage.setItem(LS_JWT_KEY, data.token);
        if (data.email) {
          localStorage.setItem(LS_EMAIL_KEY, data.email);
        }
        window.location.replace("/");
      }
    } catch {
      setBanner("Сеть недоступна", "error");
    }
  });
}

bootstrap();
