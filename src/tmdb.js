import {
  db,
  doc,
  elements,
  serverTimestamp,
  SETTINGS_DOC_PATH,
  setDoc,
  state,
  TMDB_API_BASE,
  TMDB_IMAGE_ROOT,
  getDoc
} from "./context.js";
import { setStatus } from "./ui.js";
import { escapeHtml } from "./utils.js";

let tmdbGenresMap = null;
let fillMovieFormFromLookupCallback = () => {};
let tmdbSettingsLoadedOnce = false;
let lookupDebounceId = 0;
const RECENT_LOOKUPS_KEY = "pidr-recent-lookups-v1";

export function configureTmdb({ fillMovieFormFromLookup }) {
  fillMovieFormFromLookupCallback = fillMovieFormFromLookup;
}

export function syncSettingsFields() {
  elements.tmdbLanguage.value = state.tmdbLanguage;
  elements.tmdbPosterSize.value = state.tmdbPosterSize;
  elements.tmdbAutoProxy.checked = state.tmdbAutoProxy;
  elements.tmdbUseProxy.checked = state.tmdbUseProxy;
  elements.tmdbProxyHost.value = state.tmdbProxyHost;
  syncTmdbProxyFieldState();
}

export function syncTmdbProxyFieldState() {
  const proxyEnabled = elements.tmdbUseProxy.checked || elements.tmdbAutoProxy.checked;
  elements.tmdbProxyHost.disabled = !proxyEnabled;
}

export async function handleTmdbSettingsChange() {
  state.tmdbLanguage = elements.tmdbLanguage.value;
  state.tmdbPosterSize = elements.tmdbPosterSize.value;
  state.tmdbAutoProxy = elements.tmdbAutoProxy.checked;
  state.tmdbUseProxy = elements.tmdbUseProxy.checked;
  state.tmdbProxyHost = elements.tmdbProxyHost.value.trim();
  state.tmdbLastProxyUsed = false;
  tmdbGenresMap = null;
  syncTmdbProxyFieldState();
  clearLookupUi();

  if (state.currentRole !== "admin") {
    return;
  }

  try {
    await setDoc(doc(db, ...SETTINGS_DOC_PATH), {
      tmdbLanguage: state.tmdbLanguage,
      tmdbPosterSize: state.tmdbPosterSize,
      tmdbAutoProxy: state.tmdbAutoProxy,
      tmdbUseProxy: state.tmdbUseProxy,
      tmdbProxyHost: state.tmdbProxyHost,
      updatedAt: serverTimestamp(),
      updatedBy: state.currentUser?.email || ""
    }, { merge: true });
    setStatus("TMDB настройки сохранены в Firebase.", "success", "auth");
  } catch {
    setStatus("Не удалось сохранить TMDB настройки в Firebase.", "error", "auth");
  }
}

export async function handleMovieLookup() {
  const query = elements.movieLookupQuery.value.trim();
  return performMovieLookup(query, { immediateApply: true });
}

export function handleMovieLookupInput() {
  const query = elements.movieLookupQuery.value.trim();

  window.clearTimeout(lookupDebounceId);

  if (!query) {
    elements.movieLookupResults.innerHTML = "";
    renderLookupRecentSearches();
    return;
  }

  elements.movieLookupRecent.innerHTML = "";

  lookupDebounceId = window.setTimeout(() => {
    void performMovieLookup(query, { immediateApply: false });
  }, 260);
}

export function clearMovieLookupQuery() {
  window.clearTimeout(lookupDebounceId);
  elements.movieLookupQuery.value = "";
  elements.movieLookupResults.innerHTML = "";
  renderLookupRecentSearches();
}

export function renderLookupRecentSearches() {
  if (!elements.movieLookupRecent) {
    return;
  }
  elements.movieLookupRecent.innerHTML = "";
}

async function performMovieLookup(query, { immediateApply }) {
  if (!query) {
    elements.movieLookupResults.innerHTML = "";
    renderLookupRecentSearches();
    return;
  }

  await ensureTmdbLookupReady();

  if (!state.tmdbToken) {
    elements.movieLookupResults.innerHTML = "";
    setStatus("TMDB не настроен. Обратитесь к администратору.", "error", "movieAdd");
    return;
  }

  elements.movieLookupResults.innerHTML = "";
  elements.movieLookupRecent.innerHTML = "";

  try {
    const results = await searchTmdbMovies(query);
    saveRecentLookupQuery(query);

    if (!results.length) {
      return;
    }

    if (immediateApply && results.length === 1) {
      await applyLookupResult(results[0]);
      elements.movieLookupResults.innerHTML = "";
      return;
    }

    renderLookupResults(results);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Не удалось выполнить поиск фильма.", "error", "movieAdd");
  }
}

export async function getTmdbGenresMap() {
  if (tmdbGenresMap) {
    return tmdbGenresMap;
  }

  const url = new URL(`${TMDB_API_BASE}/genre/movie/list`);
  url.searchParams.set("language", state.tmdbLanguage);
  const data = await fetchTmdbJson(url);

  tmdbGenresMap = new Map(
    (Array.isArray(data.genres) ? data.genres : [])
      .filter((genre) => genre && genre.id && genre.name)
      .map((genre) => [genre.id, genre.name])
  );

  return tmdbGenresMap;
}

export function getTmdbImageUrl(path) {
  const imageUrl = new URL(`${TMDB_IMAGE_ROOT}/${state.tmdbPosterSize}${path}`);
  const shouldUseProxy = hasTmdbProxyHost() && (state.tmdbUseProxy || state.tmdbAutoProxy || state.tmdbLastProxyUsed);

  if (shouldUseProxy) {
    const proxiedUrl = buildTmdbProxyUrl(imageUrl);
    if (proxiedUrl) {
      return proxiedUrl.toString();
    }
  }

  return imageUrl.toString();
}

export async function loadTmdbSettingsFromFirestore() {
  try {
    const snapshot = await getDoc(doc(db, ...SETTINGS_DOC_PATH));
    const settingsData = snapshot.exists() ? snapshot.data() : {};
    state.tmdbToken = String(settingsData.tmdbToken || "").trim();

    state.tmdbLanguage = typeof settingsData.tmdbLanguage === "string" ? settingsData.tmdbLanguage : "ru-RU";
    state.tmdbPosterSize = typeof settingsData.tmdbPosterSize === "string" ? settingsData.tmdbPosterSize : "w500";
    state.tmdbAutoProxy = settingsData.tmdbAutoProxy !== false;
    state.tmdbUseProxy = settingsData.tmdbUseProxy === true;
    state.tmdbProxyHost = typeof settingsData.tmdbProxyHost === "string" ? settingsData.tmdbProxyHost : "";
    state.tmdbLastProxyUsed = false;
  } catch {
    state.tmdbToken = "";
    state.tmdbLanguage = state.tmdbLanguage || "ru-RU";
    state.tmdbPosterSize = state.tmdbPosterSize || "w500";
    state.tmdbAutoProxy = state.tmdbAutoProxy !== false;
    state.tmdbUseProxy = state.tmdbUseProxy === true;
    state.tmdbProxyHost = state.tmdbProxyHost || "";
    state.tmdbLastProxyUsed = false;
  } finally {
    tmdbSettingsLoadedOnce = true;
  }
}

export function clearLookupUi() {
  clearMovieLookupQuery();
}

async function searchTmdbMovies(query) {
  const url = new URL(`${TMDB_API_BASE}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", state.tmdbLanguage);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const data = await fetchTmdbJson(url);
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .filter((movie) => movie && movie.id)
    .map((movie) => ({
      id: movie.id,
      title: movie.title || movie.original_title || "Без названия",
      year: movie.release_date ? movie.release_date.slice(0, 4) : "",
      overview: movie.overview || "",
      poster: movie.poster_path ? getTmdbImageUrl(movie.poster_path) : "",
      rating: Number(movie.vote_average || 0)
    }));
}

async function fetchTmdbMovieDetails(movieId) {
  const url = new URL(`${TMDB_API_BASE}/movie/${movieId}`);
  url.searchParams.set("language", state.tmdbLanguage);
  const movie = await fetchTmdbJson(url);

  let genres = Array.isArray(movie.genres)
    ? movie.genres.map((genre) => genre?.name).filter(Boolean)
    : [];

  if (!genres.length && Array.isArray(movie.genre_ids) && movie.genre_ids.length) {
    const genreMap = await getTmdbGenresMap();
    genres = movie.genre_ids.map((id) => genreMap.get(id)).filter(Boolean);
  }

  return {
    title: movie.title || movie.original_title || "",
    year: movie.release_date ? movie.release_date.slice(0, 4) : "",
    notes: movie.overview || "",
    poster: movie.poster_path ? getTmdbImageUrl(movie.poster_path) : "",
    genre: genres.join(", ")
  };
}

function looksLikeTmdbReadAccessToken(token) {
  return typeof token === "string" && token.startsWith("eyJ") && token.includes(".");
}

function normalizeTmdbProxyHost(rawHost) {
  const value = String(rawHost || "").trim();
  if (!value) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const normalized = new URL(withProtocol);
    normalized.hash = "";
    normalized.search = "";
    normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function hasTmdbProxyHost() {
  return Boolean(normalizeTmdbProxyHost(state.tmdbProxyHost));
}

function buildTmdbProxyUrl(url) {
  const proxyBase = normalizeTmdbProxyHost(state.tmdbProxyHost);
  if (!proxyBase) {
    return null;
  }

  const proxyUrl = new URL(proxyBase);
  const requestUrl = new URL(url.toString());
  const basePath = proxyUrl.pathname.replace(/\/+$/, "");
  const requestPath = requestUrl.pathname.startsWith("/") ? requestUrl.pathname : `/${requestUrl.pathname}`;

  proxyUrl.pathname = `${basePath}${requestPath}`;
  proxyUrl.search = requestUrl.search;
  return proxyUrl;
}

function buildTmdbRequest(url, useProxy = false) {
  const requestUrl = new URL(url.toString());
  const headers = { Accept: "application/json" };

  if (looksLikeTmdbReadAccessToken(state.tmdbToken)) {
    headers.Authorization = `Bearer ${state.tmdbToken}`;
  } else {
    requestUrl.searchParams.set("api_key", state.tmdbToken);
  }

  if (!useProxy) {
    return { requestUrl, headers, usedProxy: false };
  }

  const proxiedUrl = buildTmdbProxyUrl(requestUrl);
  if (!proxiedUrl) {
    throw new Error("Для проксирования TMDB укажите API / прокси домен в настройках.");
  }

  return { requestUrl: proxiedUrl, headers, usedProxy: true };
}

async function performTmdbRequest(request) {
  const response = await fetch(request.requestUrl, { headers: request.headers });
  state.tmdbLastProxyUsed = request.usedProxy;
  return response;
}

async function fetchTmdbJson(url) {
  if (state.tmdbUseProxy && !hasTmdbProxyHost()) {
    throw new Error("Включено проксирование TMDB, но не указан API / прокси домен.");
  }

  const forceProxy = state.tmdbUseProxy && hasTmdbProxyHost();
  const canAutoProxy = !forceProxy && state.tmdbAutoProxy && hasTmdbProxyHost();
  let request = buildTmdbRequest(url, forceProxy);
  let response;

  try {
    response = await performTmdbRequest(request);
  } catch {
    if (canAutoProxy) {
      try {
        request = buildTmdbRequest(url, true);
        response = await performTmdbRequest(request);
      } catch {
        if (looksLikeTmdbReadAccessToken(state.tmdbToken)) {
          throw new Error("TMDB недоступен напрямую. Для прокси лучше использовать обычный TMDB API key вместо Read Access Token.");
        }

        throw new Error("Не удалось подключиться к TMDB ни напрямую, ни через прокси. Проверьте TMDB ключ, прокси-домен и CORS на сервере.");
      }
    } else if (looksLikeTmdbReadAccessToken(state.tmdbToken)) {
      throw new Error("Браузер не смог обратиться к TMDB с Read Access Token. Вставьте обычный TMDB API key в настройках.");
    } else {
      throw new Error("Не удалось подключиться к TMDB. Проверьте интернет, TMDB ключ и настройки TMDB.");
    }
  }

  // В ряде сетей TMDB может отвечать 403/5xx вместо fetch-ошибки.
  // Для auto-proxy пробуем ещё раз через прокси до финального сообщения об ошибке.
  if (
    !response.ok
    && canAutoProxy
    && !request.usedProxy
    && response.status !== 401
    && response.status !== 404
  ) {
    try {
      request = buildTmdbRequest(url, true);
      response = await performTmdbRequest(request);
    } catch {
      // Оставляем старый response, ниже покажем нормализованную ошибку.
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("TMDB отклонил токен. Проверьте ключ в настройках.");
    }

    if (response.status === 404) {
      throw new Error("TMDB endpoint не найден. Проверьте настройки TMDB.");
    }

    throw new Error("TMDB сейчас недоступен. Попробуйте ещё раз.");
  }

  return response.json();
}

async function ensureTmdbLookupReady() {
  if (tmdbSettingsLoadedOnce && state.tmdbToken) {
    return;
  }

  try {
    await loadTmdbSettingsFromFirestore();
    syncSettingsFields();
  } catch {
    // no-op: handleMovieLookup покажет корректный статус ниже
  }
}

function renderLookupResults(results) {
  elements.movieLookupResults.innerHTML = "";

  results.forEach((movie) => {
    const card = document.createElement("button");
    card.className = "lookup-result lookup-result-search-card";
    card.type = "button";
    card.innerHTML = `
      <div class="lookup-result-poster">${movie.poster ? `<img src="${escapeHtml(resolveTmdbPosterUrl(movie.poster))}" alt="Постер: ${escapeHtml(movie.title)}">` : '<span class="lookup-result-poster-fallback">Нет постера</span>'}</div>
      <div class="lookup-result-copy">
        <strong>${escapeHtml(movie.title)}</strong>
        <span>${[movie.year, movie.rating ? `★ ${movie.rating.toFixed(1)}` : ""].filter(Boolean).join(" • ")}</span>
      </div>
      <span class="lookup-result-badge">MOVIE</span>
    `;

    const posterImage = card.querySelector("img");
    if (posterImage) {
      posterImage.addEventListener("error", () => {
        const slot = posterImage.closest(".lookup-result-poster");
        if (slot) {
          slot.innerHTML = '<span class="lookup-result-poster-fallback">Нет постера</span>';
        }
      }, { once: true });
    }

    card.addEventListener("click", async () => {
      card.disabled = true;
      card.classList.add("is-loading");

      try {
        await applyLookupResult(movie);
        elements.movieLookupResults.innerHTML = "";
      } finally {
        card.disabled = false;
        card.classList.remove("is-loading");
      }
    });

    elements.movieLookupResults.append(card);
  });
}

async function applyLookupResult(movie) {
  const details = await fetchTmdbMovieDetails(movie.id);
  fillMovieFormFromLookupCallback(details);
}

function getRecentLookupQueries() {
  try {
    const raw = localStorage.getItem(RECENT_LOOKUPS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecentLookupQuery(query) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    return;
  }

  const nextQueries = [
    normalizedQuery,
    ...getRecentLookupQueries().filter((item) => item.toLocaleLowerCase("ru") !== normalizedQuery.toLocaleLowerCase("ru"))
  ].slice(0, 5);

  try {
    localStorage.setItem(RECENT_LOOKUPS_KEY, JSON.stringify(nextQueries));
  } catch {
    // ignore
  }
}

export function resolveTmdbPosterUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const isTmdbImage = /(^|\.)image\.tmdb\.org$/i.test(url.hostname);
    if (!isTmdbImage) {
      return value;
    }

    const shouldUseProxy = hasTmdbProxyHost() && (state.tmdbUseProxy || state.tmdbAutoProxy || state.tmdbLastProxyUsed);
    if (!shouldUseProxy) {
      return value;
    }

    const proxiedUrl = buildTmdbProxyUrl(url);
    return proxiedUrl ? proxiedUrl.toString() : value;
  } catch {
    return value;
  }
}
