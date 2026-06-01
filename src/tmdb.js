import {
  db,
  doc,
  elements,
  preferences,
  savePreferences,
  serverTimestamp,
  SETTINGS_DOC_PATH,
  setDoc,
  state,
  TMDB_API_BASE,
  TMDB_IMAGE_ROOT,
  getDoc
} from "./context.js";
import { setStatus } from "./ui.js";

let tmdbGenresMap = null;
let fillMovieFormFromLookupCallback = () => {};

export function configureTmdb({ fillMovieFormFromLookup }) {
  fillMovieFormFromLookupCallback = fillMovieFormFromLookup;
}

export function syncSettingsFields() {
  elements.tmdbToken.value = state.tmdbToken || "";
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
  state.tmdbToken = elements.tmdbToken.value.trim();
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
      tmdbToken: state.tmdbToken,
      tmdbLanguage: state.tmdbLanguage,
      tmdbPosterSize: state.tmdbPosterSize,
      tmdbAutoProxy: state.tmdbAutoProxy,
      tmdbUseProxy: state.tmdbUseProxy,
      tmdbProxyHost: state.tmdbProxyHost,
      updatedAt: serverTimestamp(),
      updatedBy: state.currentUser?.email || ""
    }, { merge: true });
    savePreferences();
    setStatus("TMDB ключ сохранён в Firebase.", "success", "auth");
  } catch {
    setStatus("Не удалось сохранить TMDB ключ в Firebase.", "error", "auth");
  }
}

export async function handleMovieLookup() {
  const query = elements.movieLookupQuery.value.trim();
  if (!query) {
    setLookupStatus("Введите название фильма для поиска.");
    elements.movieLookupResults.innerHTML = "";
    return;
  }

  if (!state.tmdbToken) {
    setLookupStatus("Сначала добавьте TMDB токен в настройках.");
    elements.movieLookupResults.innerHTML = "";
    return;
  }

  setLookupStatus("Ищем фильмы...");
  elements.movieLookupResults.innerHTML = "";
  elements.movieLookupButton.disabled = true;

  try {
    const results = await searchTmdbMovies(query);

    if (!results.length) {
      setLookupStatus("Ничего не найдено. Попробуйте другое название.");
      return;
    }

    if (results.length === 1) {
      await applyLookupResult(results[0]);
      elements.movieLookupResults.innerHTML = "";
      return;
    }

    setLookupStatus("Нашлось несколько похожих вариантов. Выберите нужный фильм из списка.");
    renderLookupResults(results);
  } catch (error) {
    setLookupStatus(error instanceof Error ? error.message : "Не удалось выполнить поиск фильма.");
  } finally {
    elements.movieLookupButton.disabled = false;
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
  if (!state.currentUser || state.currentRole !== "admin") {
    state.tmdbToken = "";
    state.tmdbLanguage = "ru-RU";
    state.tmdbPosterSize = "w500";
    state.tmdbAutoProxy = true;
    state.tmdbUseProxy = false;
    state.tmdbProxyHost = "";
    state.tmdbLastProxyUsed = false;
    return;
  }

  const snapshot = await getDoc(doc(db, ...SETTINGS_DOC_PATH));
  const settingsData = snapshot.exists() ? snapshot.data() : {};
  const firestoreToken = String(settingsData.tmdbToken || "").trim();

  if (!firestoreToken && preferences.tmdbToken) {
    state.tmdbToken = preferences.tmdbToken.trim();
    await setDoc(doc(db, ...SETTINGS_DOC_PATH), {
      tmdbToken: state.tmdbToken,
      updatedAt: serverTimestamp(),
      updatedBy: state.currentUser.email || ""
    }, { merge: true });
    preferences.tmdbToken = "";
    savePreferences();
    return;
  }

  state.tmdbToken = firestoreToken;
  state.tmdbLanguage = typeof settingsData.tmdbLanguage === "string" ? settingsData.tmdbLanguage : "ru-RU";
  state.tmdbPosterSize = typeof settingsData.tmdbPosterSize === "string" ? settingsData.tmdbPosterSize : "w500";
  state.tmdbAutoProxy = settingsData.tmdbAutoProxy !== false;
  state.tmdbUseProxy = settingsData.tmdbUseProxy === true;
  state.tmdbProxyHost = typeof settingsData.tmdbProxyHost === "string" ? settingsData.tmdbProxyHost : "";
  state.tmdbLastProxyUsed = false;
}

export function clearLookupUi() {
  elements.movieLookupQuery.value = "";
  elements.movieLookupResults.innerHTML = "";
  setLookupStatus(state.tmdbToken ? "" : "Для автопоиска добавьте TMDB токен в настройках.");
}

function setLookupStatus(message) {
  elements.movieLookupStatus.textContent = message;
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
    .slice(0, 5)
    .map((movie) => ({
      id: movie.id,
      title: movie.title || movie.original_title || "Без названия",
      year: movie.release_date ? movie.release_date.slice(0, 4) : "",
      overview: movie.overview || "",
      poster: movie.poster_path ? getTmdbImageUrl(movie.poster_path) : ""
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

function renderLookupResults(results) {
  elements.movieLookupResults.innerHTML = "";

  results.forEach((movie) => {
    const card = document.createElement("div");
    card.className = "lookup-result";
    card.innerHTML = `
      <div class="poster-slot lookup-result-poster">${movie.poster ? `<img src="${movie.poster}" alt="Постер: ${movie.title}">` : "Постер"}</div>
      <div class="lookup-result-copy">
        <strong>${movie.title}${movie.year ? ` (${movie.year})` : ""}</strong>
        <span>${movie.overview || "Описание пока не найдено."}</span>
      </div>
      <button class="button button-primary lookup-result-action" type="button">Подставить</button>
    `;

    card.querySelector(".lookup-result-action").addEventListener("click", async () => {
      const button = card.querySelector(".lookup-result-action");
      button.disabled = true;
      button.textContent = "Загружаем...";

      try {
        await applyLookupResult(movie);
        elements.movieLookupResults.innerHTML = "";
      } finally {
        button.disabled = false;
        button.textContent = "Подставить";
      }
    });

    elements.movieLookupResults.append(card);
  });
}

async function applyLookupResult(movie) {
  const details = await fetchTmdbMovieDetails(movie.id);
  fillMovieFormFromLookupCallback(details);
  setLookupStatus(`Данные для фильма «${details.title || movie.title}» подставлены в форму.`);
}
