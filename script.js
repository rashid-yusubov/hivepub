import { initApp } from "./src/app.js";

const preloader = document.getElementById("app-preloader");
const PRELOADER_MIN_MS = 800;
const preloaderStart = typeof performance !== "undefined" ? performance.now() : Date.now();
let preloaderHideStarted = false;

function hidePreloader() {
  if (!preloader) {
    return;
  }

  if (preloaderHideStarted) {
    return;
  }
  preloaderHideStarted = true;

  const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - preloaderStart;
  const remaining = Math.max(0, PRELOADER_MIN_MS - elapsed);

  window.setTimeout(() => {
    preloader.classList.add("is-hidden");
    window.setTimeout(() => {
      preloader.remove();
    }, 260);
  }, remaining);
}

try {
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
