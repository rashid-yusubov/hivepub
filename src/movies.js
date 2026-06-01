import {
  addDoc,
  addMovieRefs,
  collection,
  db,
  deleteDoc,
  doc,
  editMovieRefs,
  elements,
  getDocs,
  serverTimestamp,
  setDoc,
  state,
  updateDoc,
  writeBatch
} from "./context.js";
import { filterState } from "./context.js";
import { compareValues, createEmptyState, escapeHtml, formatDate, getTodayInputValue, normalizeMovieTitle, readFileAsDataUrl } from "./utils.js";
import { matchesFilter, getSortDirectionMultiplier, resetFilterState } from "./filters.js";
import { getAverageRating, getAllRatings, clampRating, openRatingDialog } from "./ratings.js";
import { getUserAvatarMarkup, getUserLabel, isAdmin, setStatus } from "./ui.js";

let refreshAppDataCallback = async () => {};
let openAuthDialogCallback = () => {};
let openDialogCallback = () => {};

export function configureMovies({ refreshAppData, openAuthDialog, openDialog }) {
  refreshAppDataCallback = refreshAppData;
  openAuthDialogCallback = openAuthDialog;
  openDialogCallback = openDialog;
}

export async function loadMoviesFromFirestore() {
  const snapshot = await getDocs(collection(db, "movies"));
  const movies = await Promise.all(snapshot.docs.map(loadMovieSnapshot));
  state.movies = movies.sort((left, right) => compareValues(left.watchedOn || "", right.watchedOn || ""));
}

export function renderMovies() {
  elements.movieList.innerHTML = "";

  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const sortedMovies = [...state.movies]
    .filter((movie) => {
      const haystack = `${movie.title} ${movie.genre || ""} ${movie.notes || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    })
    .filter(matchesFilter)
    .sort(getMovieSorter(filterState.sortBy));

  if (!sortedMovies.length) {
    const title = state.movies.length ? "Ничего не найдено" : "Пока нет фильмов";
    const text = state.movies.length ? "Попробуйте изменить запрос." : "Администратор может добавить первый фильм.";
    elements.movieList.append(createEmptyState(title, text));
    return;
  }

  sortedMovies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";
    card.tabIndex = 0;

    const average = getAverageRating(movie);
    const totalRatings = getAllRatings(movie).length;
    const currentUserRating = state.currentUser ? movie.userRatings?.[state.currentUser.uid]?.value : null;
    const rateButtonLabel = currentUserRating ? "Изменить" : "Оценить";
    const rateButtonMeta = currentUserRating ? `<span class="rate-user-pill">★ ${Number(currentUserRating).toFixed(1)}</span>` : "";

    card.innerHTML = `
      ${renderPoster(movie)}
      <div class="movie-main">
        <div class="movie-copy">
          <div class="movie-title-row">
            <h3>${escapeHtml(movie.title)}</h3>
            ${movie.year ? `<span class="movie-year">${escapeHtml(movie.year)}</span>` : ""}
          </div>
          <p class="movie-meta">${escapeHtml(formatMovieMeta(movie) || "Без жанра и даты")}${totalRatings ? ` • Оценок: ${totalRatings}` : ""}</p>
          <p class="movie-description">${escapeHtml(movie.notes || "Описание пока не добавлено.")}</p>
        </div>
        <div class="movie-side">
          <div class="score-pill">${average.toFixed(1)}</div>
          <div class="rate-user-actions">
            <button class="button button-secondary rate-button" type="button">
              <span class="button-content"><span class="button-icon" aria-hidden="true">★</span><span>${rateButtonLabel}</span>${rateButtonMeta}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    card.querySelector(".rate-button").addEventListener("click", (event) => {
      event.stopPropagation();
      openRatingDialog(movie.id);
    });

    card.addEventListener("click", () => openDetailsDialog(movie.id));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetailsDialog(movie.id);
      }
    });

    elements.movieList.append(card);
  });
}

export function renderRatingFields(container) {
  container.innerHTML = "";

  if (!state.currentUser) {
    container.append(createEmptyState("Требуется вход", "Оценки доступны только после авторизации."));
    return;
  }

  if (!state.friends.length) {
    container.append(createEmptyState("Нет пользователей", "Сначала кто-то должен зарегистрироваться или войти."));
    return;
  }

  state.friends.forEach((friend) => {
    const user = state.users.find((item) => item.email === friend);
    const fragment = elements.ratingTemplate.content.cloneNode(true);
    const avatar = fragment.querySelector(".rating-avatar");
    const name = fragment.querySelector(".rating-name");
    const input = fragment.querySelector(".rating-input");

    if (avatar) {
      avatar.outerHTML = getUserAvatarMarkup(user, "user-avatar-xs rating-avatar");
    }
    name.textContent = getUserLabel(user);
    input.name = `rating-${friend}`;
    input.dataset.friend = friend;
    input.setAttribute("aria-label", `Оценка для ${getUserLabel(user)}`);

    container.append(fragment);
  });
}

export async function handleMovieSubmit(event) {
  await saveMovieForm(event, addMovieRefs, { mode: "create" });
}

export async function handleEditMovieSubmit(event) {
  await saveMovieForm(event, editMovieRefs, { mode: "edit" });
}

export async function removeMovie(movieId) {
  if (!isAdmin()) {
    return;
  }

  if (!confirm("Удалить этот фильм из коллекции?")) {
    return;
  }

  const ratingsSnapshot = await getDocs(collection(db, "movies", movieId, "ratings"));
  const batch = writeBatch(db);

  ratingsSnapshot.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(db, "movies", movieId));
  await batch.commit();
  setStatus("Фильм удалён из коллекции.", "success", "delete");
  await refreshAppDataCallback();
}

export async function clearAllData() {
  if (!isAdmin()) {
    return;
  }

  if (!confirm("Удалить все фильмы и оценки?")) {
    return;
  }

  for (const movie of state.movies) {
    const ratingsSnapshot = await getDocs(collection(db, "movies", movie.id, "ratings"));
    const batch = writeBatch(db);
    ratingsSnapshot.forEach((item) => batch.delete(item.ref));
    batch.delete(doc(db, "movies", movie.id));
    await batch.commit();
  }

  resetMovieForm(addMovieRefs);
  resetMovieForm(editMovieRefs);
  resetFilterState({ closeDialog: false, rerender: false });
  elements.searchInput.value = "";
  setStatus("Все фильмы и оценки удалены.", "success", "delete");
  await refreshAppDataCallback();
}

export function openMovieDialog() {
  resetMovieForm(addMovieRefs);
  openDialogCallback(elements.movieDialog);
  requestAnimationFrame(() => elements.movieLookupQuery.focus());
}

export function openMovieEditor(movieId) {
  const movie = state.movies.find((item) => item.id === movieId);
  if (!movie || !isAdmin()) {
    return;
  }

  resetMovieForm(editMovieRefs);
  setMovieEditingState(editMovieRefs, movieId);
  fillMovieForm(movie, editMovieRefs);
  openDialogCallback(elements.editMovieDialog);
}

export function openDetailsDialog(movieId) {
  const movie = state.movies.find((item) => item.id === movieId);
  if (!movie) {
    return;
  }

  const namedRatings = Object.entries(movie.userRatings || {})
    .map(([userId, item]) => {
      const user = state.users.find((entry) => entry.id === userId);
      const removeButton = isAdmin()
        ? `<button class="icon-button details-rating-delete" type="button" data-user-id="${escapeHtml(userId)}" aria-label="Удалить оценку ${escapeHtml(item.label)}">×</button>`
        : "";
      return `<li><span class="user-inline">${getUserAvatarMarkup(user, "user-avatar-xs")}<span>${escapeHtml(item.label)}</span></span><strong>${Number(item.value).toFixed(1)}</strong>${removeButton}</li>`;
    })
    .join("");

  const adminActions = isAdmin()
    ? `
      <button class="button button-secondary details-edit" type="button">
        <span class="button-content"><span class="button-icon" aria-hidden="true">✎</span><span>Редактировать</span></span>
      </button>
      <button class="ghost-link details-delete" type="button">
        <span class="button-content"><span class="button-icon" aria-hidden="true">⌫</span><span>Удалить фильм</span></span>
      </button>
    `
    : "";
  const currentUserRating = state.currentUser ? movie.userRatings?.[state.currentUser.uid]?.value : null;
  const detailsRateLabel = currentUserRating ? "Изменить" : "Оценить";
  const detailsRateMeta = currentUserRating ? `<span class="rate-user-pill details-rate-pill">★ ${Number(currentUserRating).toFixed(1)}</span>` : "";

  elements.detailsContent.innerHTML = `
    <div class="details-layout">
      ${renderPoster(movie, "details-poster")}
      <div class="details-main">
        <div class="details-top">
          <div class="details-copy">
            <h3 class="details-title">${escapeHtml(movie.title)}${movie.year ? ` <span>(${escapeHtml(movie.year)})</span>` : ""}</h3>
            <p class="details-subtitle">${escapeHtml(formatMovieMeta(movie) || "Без жанра и даты")}</p>
            <p class="details-notes">${escapeHtml(movie.notes || "Описание пока не добавлено.")}</p>
          </div>
          <div class="details-side">
            <div class="details-score-block">
              <div class="score-pill details-score-pill">${getAverageRating(movie).toFixed(1)}</div>
            </div>
            <div class="details-actions">
              <div class="rate-user-actions">
                <button class="button button-secondary details-rate" type="button">
                  <span class="button-content"><span class="button-icon" aria-hidden="true">★</span><span>${detailsRateLabel}</span>${detailsRateMeta}</span>
                </button>
              </div>
              ${adminActions}
            </div>
          </div>
        </div>
        <div class="details-ratings">
          <section class="details-ratings-block">
            <h3>Оценки пользователей</h3>
            ${namedRatings ? `<ul>${namedRatings}</ul>` : `<p class="panel-hint">Пока нет.</p>`}
          </section>
        </div>
      </div>
    </div>
  `;

  elements.detailsContent.querySelector(".details-rate").addEventListener("click", () => {
    elements.detailsDialog.close();
    openRatingDialog(movie.id);
  });

  if (isAdmin()) {
    elements.detailsContent.querySelector(".details-edit").addEventListener("click", () => {
      elements.detailsDialog.close();
      openMovieEditor(movie.id);
    });

    elements.detailsContent.querySelector(".details-delete").addEventListener("click", async () => {
      elements.detailsDialog.close();
      await removeMovie(movie.id);
    });

    elements.detailsContent.querySelectorAll(".details-rating-delete").forEach((button) => {
      button.addEventListener("click", async () => {
        await deleteNamedRating(movie.id, button.dataset.userId || "");
      });
    });
  }

  openDialogCallback(elements.detailsDialog);
}

export function fillMovieFormFromLookup(movie) {
  addMovieRefs.title().value = movie.title || "";
  addMovieRefs.year().value = movie.year || "";
  addMovieRefs.genre().value = movie.genre || "";
  addMovieRefs.notes().value = movie.notes || "";
  addMovieRefs.posterUrl().value = movie.poster || "";
  addMovieRefs.posterFile().value = "";
}

export function handleMovieFormReset() {
  resetMovieForm(addMovieRefs);
}

export function resetMovieEditorForm() {
  resetMovieForm(editMovieRefs);
}

function getMovieSorter(mode) {
  const direction = getSortDirectionMultiplier();

  if (mode === "rating") {
    return (a, b) => (getAverageRating(b) - getAverageRating(a)) * direction;
  }

  if (mode === "title") {
    return (a, b) => a.title.localeCompare(b.title, "ru") * direction;
  }

  if (mode === "released") {
    return (a, b) => compareValues(a.year || "", b.year || "") * direction;
  }

  return (a, b) => compareValues(a.watchedOn || "", b.watchedOn || "") * direction;
}

function formatMovieMeta(movie) {
  const parts = [];
  if (movie.genre) {
    parts.push(movie.genre);
  }
  if (movie.watchedOn) {
    parts.push(formatDate(movie.watchedOn));
  }
  return parts.join(" • ");
}

function renderPoster(movie, extraClass = "") {
  const className = extraClass ? `poster-slot ${extraClass}` : "poster-slot";
  if (movie.poster) {
    return `<div class="${className}"><img src="${escapeHtml(movie.poster)}" alt="Постер: ${escapeHtml(movie.title)}"></div>`;
  }

  return `<div class="${className}">${escapeHtml(movie.genre || "Постер")}</div>`;
}

async function loadMovieSnapshot(snapshot) {
  const data = snapshot.data();
  const ratings = {};
  const userRatings = {};

  try {
    const ratingsSnapshot = await getDocs(collection(db, "movies", snapshot.id, "ratings"));
    ratingsSnapshot.forEach((ratingDoc) => {
      const ratingData = ratingDoc.data();
      const userFromState = state.users.find((user) => user.id === ratingDoc.id);
      const label = userFromState ? getUserLabel(userFromState) : (ratingData.userLabel || ratingData.userEmail || ratingDoc.id);
      ratings[label] = Number(ratingData.value);
      userRatings[ratingDoc.id] = { label, value: Number(ratingData.value) };
    });
  } catch (error) {
    console.error("Не удалось загрузить оценки фильма для гостя.", error);
  }

  return {
    id: snapshot.id,
    title: data.title || "",
    year: data.year || "",
    watchedOn: data.watchedOn || "",
    genre: data.genre || "",
    poster: data.poster || "",
    notes: data.notes || "",
    ratings,
    userRatings,
    createdAt: data.createdAt || null
  };
}

function getMovieFormRatings(container) {
  const ratingsMap = new Map();

  state.users.forEach((user) => {
    const field = container.querySelector(`[data-friend="${CSS.escape(user.email)}"]`);
    const value = field?.value.trim();
    if (!value) {
      return;
    }

    const normalizedValue = clampRating(value);
    if (!normalizedValue) {
      throw new Error(`У оценки пользователя ${user.email} должен быть шаг 0.5.`);
    }

    ratingsMap.set(user.id, {
      userId: user.id,
      userEmail: user.email,
      userLabel: getUserLabel(user),
      value: normalizedValue
    });
  });

  return ratingsMap;
}

async function saveMovieForm(event, refs, options) {
  event.preventDefault();

  if (!isAdmin()) {
    setStatus("Только администратор может менять фильмы.", "error", "movieEdit");
    return;
  }

  const formData = new FormData(refs.form());
  const editingMovieId = refs.editId().value.trim();
  const title = String(formData.get("title") || "").trim();
  const poster = await getPosterValue(refs);

  if (!title) {
    setStatus("Введите название фильма.", "error", "movieEdit");
    return;
  }

  let ratingsMap;
  try {
    ratingsMap = getMovieFormRatings(refs.ratingsFields());
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Введите корректные оценки с шагом 0.5.", "error", "rating");
    return;
  }

  const year = String(formData.get("year") || "").trim();
  const duplicateIgnoreId = options.mode === "edit" ? editingMovieId : "";
  if (hasDuplicateMovie(title, year, duplicateIgnoreId)) {
    setStatus("Такой фильм уже есть в списке.", "error", options.mode === "edit" ? "movieEdit" : "movieAdd");
    return;
  }

  const payload = {
    title,
    year,
    watchedOn: String(formData.get("watchedOn") || "").trim(),
    genre: String(formData.get("genre") || "").trim(),
    poster,
    notes: String(formData.get("notes") || "").trim(),
    updatedAt: serverTimestamp()
  };

  if (options.mode === "edit") {
    if (!editingMovieId) {
      setStatus("Не удалось определить фильм для редактирования.", "error", "movieEdit");
      return;
    }

    await updateDoc(doc(db, "movies", editingMovieId), payload);
    await syncMovieRatings(editingMovieId, ratingsMap);
  } else {
    const movieRef = await addDoc(collection(db, "movies"), {
      ...payload,
      createdBy: state.currentUser?.uid || "",
      createdAt: serverTimestamp()
    });
    await syncMovieRatings(movieRef.id, ratingsMap);
  }

  resetMovieForm(refs);
  refs.dialog().close();
  setStatus(options.mode === "edit" ? `Фильм «${title}» обновлён.` : `Фильм «${title}» добавлен.`, "success", options.mode === "edit" ? "movieEdit" : "movieAdd");
  await refreshAppDataCallback();
}

async function syncMovieRatings(movieId, ratingsMap) {
  const ratingsCollection = collection(db, "movies", movieId, "ratings");
  const existingSnapshot = await getDocs(ratingsCollection);
  const batch = writeBatch(db);

  existingSnapshot.forEach((ratingDoc) => {
    if (!ratingsMap.has(ratingDoc.id)) {
      batch.delete(ratingDoc.ref);
    }
  });

  ratingsMap.forEach((rating, userId) => {
    batch.set(doc(db, "movies", movieId, "ratings", userId), {
      userId,
      userEmail: rating.userEmail,
      userLabel: rating.userLabel,
      value: rating.value,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

async function deleteNamedRating(movieId, userId) {
  if (!isAdmin()) {
    return;
  }

  await deleteDoc(doc(db, "movies", movieId, "ratings", userId));
  setStatus("Оценка удалена.", "success", "delete");
  await refreshAppDataCallback();
  openDetailsDialog(movieId);
}

function fillMovieForm(movie, refs) {
  refs.title().value = movie.title || "";
  refs.year().value = movie.year || "";
  refs.date().value = movie.watchedOn || getTodayInputValue();
  refs.genre().value = movie.genre || "";
  refs.notes().value = movie.notes || "";
  refs.posterUrl().value = movie.poster || "";
  refs.posterFile().value = "";

  state.users.forEach((user) => {
    const field = refs.ratingsFields().querySelector(`[data-friend="${CSS.escape(user.email)}"]`);
    if (field) {
      field.value = movie.userRatings?.[user.id]?.value ? String(movie.userRatings[user.id].value) : "";
    }
  });
}

function resetMovieForm(refs) {
  clearMovieEditingState(refs);
  refs.form().reset();
  refs.date().value = getTodayInputValue();
  refs.posterUrl().value = "";
  refs.posterFile().value = "";
  clearMovieRatingFields(refs.ratingsFields());
  if (refs.clearLookup) {
    elements.movieLookupQuery.value = "";
    elements.movieLookupResults.innerHTML = "";
    elements.movieLookupStatus.textContent = state.tmdbToken ? "" : "Для автопоиска добавьте TMDB токен в настройках.";
  }
}

function clearMovieRatingFields(container) {
  container.querySelectorAll(".rating-input").forEach((input) => {
    input.value = "";
  });
}

function setMovieEditingState(refs, movieId) {
  refs.editId().value = movieId || "";
  refs.submitButton().textContent = movieId ? "Сохранить изменения" : "Сохранить";
}

function clearMovieEditingState(refs) {
  setMovieEditingState(refs, "");
}

function getPosterValue(refs) {
  const urlValue = refs.posterUrl().value.trim();
  const file = refs.posterFile().files?.[0];
  if (file) {
    return readFileAsDataUrl(file);
  }

  return Promise.resolve(urlValue);
}

function hasDuplicateMovie(title, year, excludedMovieId = "") {
  const normalizedTitle = normalizeMovieTitle(title);
  const normalizedYear = String(year || "").trim();

  return state.movies.some((movie) => {
    if (movie.id === excludedMovieId) {
      return false;
    }

    return normalizeMovieTitle(movie.title) === normalizedTitle
      && String(movie.year || "").trim() === normalizedYear;
  });
}
