import { initApp } from "./src/app.js";

const preloader = document.getElementById("app-preloader");
const PRELOADER_MIN_MS = 800;
let preloaderHideStarted = false;
let lastShowAt = null;
let hideTimerId = null;

function getNowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function showPreloader() {
  if (!preloader) {
    return;
  }

  lastShowAt = getNowMs();
  preloaderHideStarted = false;

  if (hideTimerId) {
    window.clearTimeout(hideTimerId);
    hideTimerId = null;
  }

  preloader.setAttribute("aria-hidden", "false");
  preloader.classList.remove("is-hidden");

  // Перезапускаем fade логотипа при повторном показе
  const logo = preloader.querySelector(".app-preloader-logo");
  if (logo) {
    // force reflow to restart animation
    logo.style.animation = "none";
    // eslint-disable-next-line no-unused-expressions
    logo.offsetHeight;
    logo.style.animation = "app-preloader-logo-fade 520ms ease forwards";
  }
}

function hidePreloader() {
  if (!preloader) {
    return;
  }

  if (preloaderHideStarted) {
    return;
  }
  preloaderHideStarted = true;

  const now = getNowMs();
  const elapsed = lastShowAt == null ? 0 : now - lastShowAt;
  const remaining = Math.max(0, PRELOADER_MIN_MS - elapsed);

  hideTimerId = window.setTimeout(() => {
    preloader.setAttribute("aria-hidden", "true");
    preloader.classList.add("is-hidden");
  }, remaining);
}

globalThis.__pidrPreloader = { show: showPreloader, hide: hidePreloader };

try {
  // Обозначаем старт показа для гарантии минимальной длительности
  showPreloader();
  initApp();
  hidePreloader();
} catch (error) {
  hidePreloader();
  console.error("Startup error:", error);
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const banner = document.createElement("div");
  banner.style.position = "fixed";
  banner.style.top = "16px";
  banner.style.left = "50%";
  banner.style.transform = "translateX(-50%)";
  banner.style.zIndex = "99999";
  banner.style.maxWidth = "min(920px, calc(100vw - 32px))";
  banner.style.padding = "14px 18px";
  banner.style.border = "1px solid rgba(255, 86, 86, 0.45)";
  banner.style.borderRadius = "14px";
  banner.style.background = "rgba(33, 12, 12, 0.96)";
  banner.style.color = "#fff";
  banner.style.font = "14px/1.5 system-ui, sans-serif";
  banner.style.boxShadow = "0 16px 40px rgba(0, 0, 0, 0.35)";
  banner.textContent = `Ошибка запуска сайта: ${message}`;
  document.body.append(banner);
}
