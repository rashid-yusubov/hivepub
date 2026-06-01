export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createEmptyState(title, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>`;
  return wrapper;
}

export function compareValues(left, right) {
  return String(right).localeCompare(String(left), "ru", { numeric: true });
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatAccountCreationDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function getTodayInputValue() {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function sanitizeYearInput(value) {
  return String(value).replace(/\D+/g, "").slice(0, 4);
}

export function normalizeMovieTitle(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru");
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Не удалось прочитать файл постера."));
    reader.readAsDataURL(file);
  });
}

export function getReadableError(error) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (message.includes("Missing or insufficient permissions")) {
    return "Firebase пустил во вход, но Firestore rules пока блокируют доступ. Откройте правила Firestore и вставьте правила из файла firestore.rules.";
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/invalid-login-credentials")) {
    return "Не удалось войти. Проверьте логин и пароль.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Не удалось связаться с Firebase. Проверьте интернет и настройки проекта.";
  }

  if (message.includes("auth/popup-closed-by-user")) {
    return "Вход через Google был закрыт до завершения.";
  }

  if (message.includes("auth/account-exists-with-different-credential")) {
    return "Для этой почты уже есть другой способ входа. Войдите старым способом и потом привяжите Google.";
  }

  if (message.includes("auth/provider-already-linked")) {
    return "Google уже привязан к этому аккаунту.";
  }

  if (message.includes("auth/credential-already-in-use")) {
    return "Этот Google-аккаунт уже привязан к другой учётной записи.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "Эта почта уже используется другим аккаунтом.";
  }

  if (message.includes("auth/requires-recent-login")) {
    return "Для смены почты или удаления аккаунта нужно заново войти в систему.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Проверьте, что нужный способ входа включён в Firebase Authentication.";
  }

  return message || "Произошла ошибка.";
}
