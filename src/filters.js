import { elements, filterState, state } from "./context.js";
import { createEmptyState, escapeHtml, sanitizeYearInput } from "./utils.js";

let renderAppCallback = () => {};

export function configureFilters({ renderApp }) {
  renderAppCallback = renderApp;
}

export function openFilterDialog(openDialog) {
  populateYearInputs();
  syncFilterForm();
  openDialog(elements.filterDialog);
}

export function handleFilterSubmit(event) {
  event.preventDefault();
  filterState.yearFrom = elements.filterYearFrom.value.trim();
  filterState.yearTo = elements.filterYearTo.value.trim();
  filterState.genres = getIncludedGenres();
  filterState.excludedGenres = getExcludedGenres();
  filterState.strictGenreMatch = elements.filterStrictMatch.checked;
  elements.filterDialog.close();
  renderAppCallback();
}

export function resetFilterState(options = { closeDialog: true, rerender: true }) {
  filterState.yearFrom = "";
  filterState.yearTo = "";
  filterState.genres = [];
  filterState.excludedGenres = [];
  filterState.strictGenreMatch = false;

  populateYearInputs();
  syncFilterForm();

  if (options.closeDialog) {
    elements.filterDialog.close();
  }

  if (options.rerender) {
    renderAppCallback();
  }
}

export function syncFilterForm() {
  elements.filterYearFrom.value = filterState.yearFrom;
  elements.filterYearTo.value = filterState.yearTo;
  elements.filterStrictMatch.checked = filterState.strictGenreMatch;
  syncYearLabel();
  renderGenreOptions();
}

export function renderFilterSummary(getFilteredMoviesCount) {
  const sortLabels = {
    released: "по дате выхода",
    watched: "по дате просмотра",
    rating: "по рейтингу",
    title: "по названию"
  };
  const directionLabel = filterState.sortDirection === "asc" ? "по возрастанию" : "по убыванию";
  let summary = `Сортировка: ${sortLabels[filterState.sortBy]}, ${directionLabel}`;

  if (filterState.yearFrom || filterState.yearTo) {
    summary += ` • Годы: ${filterState.yearFrom || "−"}–${filterState.yearTo || "−"}`;
  }

  if (filterState.genres.length) {
    summary += ` • Жанры: ${filterState.genres.join(", ")}`;
  }

  if (filterState.excludedGenres.length) {
    summary += ` • Исключить: ${filterState.excludedGenres.join(", ")}`;
  }

  if (filterState.strictGenreMatch && filterState.genres.length) {
    summary += " • Строгое совпадение";
  }

  summary += ` • Фильмов: ${getFilteredMoviesCount()}`;
  elements.filterSummary.textContent = summary;
}

export function matchesFilter(movie) {
  const year = Number(movie.year);
  const from = filterState.yearFrom ? Number(filterState.yearFrom) : null;
  const to = filterState.yearTo ? Number(filterState.yearTo) : null;

  if (!Number.isNaN(year)) {
    if (from !== null && year < from) {
      return false;
    }
    if (to !== null && year > to) {
      return false;
    }
  } else if (from !== null || to !== null) {
    return false;
  }

  const movieGenres = (movie.genre || "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

  if (filterState.excludedGenres.length && filterState.excludedGenres.some((genre) => movieGenres.includes(genre))) {
    return false;
  }

  if (!filterState.genres.length) {
    return true;
  }

  if (filterState.strictGenreMatch) {
    return filterState.genres.every((genre) => movieGenres.includes(genre));
  }

  return filterState.genres.some((genre) => movieGenres.includes(genre));
}

export function getSortDirectionMultiplier() {
  return filterState.sortDirection === "asc" ? -1 : 1;
}

export function handleSortControlsChange() {
  filterState.sortBy = elements.sortSelect.value;
  renderAppCallback();
}

export function syncSortControls() {
  elements.sortSelect.value = filterState.sortBy;
  const isAscending = filterState.sortDirection === "asc";
  elements.sortDirection.setAttribute("aria-pressed", String(isAscending));
  const label = elements.sortDirection.querySelector(".sort-toggle-label");
  if (label) {
    label.textContent = isAscending ? "↑" : "↓";
  }
}

export function toggleSortDirection() {
  filterState.sortDirection = filterState.sortDirection === "asc" ? "desc" : "asc";
  renderAppCallback();
}

export function getMovieSearchResultsCount() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();

  return state.movies
    .filter((movie) => {
      const haystack = `${movie.title} ${movie.genre || ""} ${movie.notes || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    })
    .filter(matchesFilter)
    .length;
}

export function getAvailableYears() {
  const years = state.movies
    .map((movie) => Number(movie.year))
    .filter((year) => !Number.isNaN(year));

  if (!years.length) {
    const currentYear = new Date().getFullYear();
    return { min: 1990, max: currentYear };
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years)
  };
}

export function populateYearInputs() {
  const { min, max } = getAvailableYears();
  elements.filterYearFrom.placeholder = String(min);
  elements.filterYearTo.placeholder = String(max);
}

export function renderGenreOptions() {
  const genres = [...new Set(
    state.movies
      .flatMap((movie) => (movie.genre || "").split(","))
      .map((genre) => genre.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "ru"));

  elements.genreOptions.innerHTML = "";

  if (!genres.length) {
    elements.genreOptions.append(createEmptyState("Нет жанров", "Жанры появятся после добавления фильмов."));
    return;
  }

  genres.forEach((genre) => {
    const button = document.createElement("button");
    const stateName = getGenreState(genre);
    button.className = `genre-option${stateName === "include" ? " is-selected" : ""}${stateName === "exclude" ? " is-excluded" : ""}`;
    button.type = "button";
    button.dataset.genre = genre;
    button.dataset.state = stateName;
    button.setAttribute("aria-pressed", stateName === "include" ? "true" : "false");
    button.setAttribute("aria-label", `Жанр ${genre}: ${getGenreStateLabel(stateName)}`);
    button.innerHTML = `
      <span class="genre-option-marker" aria-hidden="true">${stateName === "include" ? "✓" : stateName === "exclude" ? "×" : ""}</span>
      <span class="genre-option-label">${escapeHtml(genre)}</span>
    `;
    button.addEventListener("click", () => cycleGenreState(button, genre));
    elements.genreOptions.append(button);
  });
}

export function clearGenreSelection() {
  filterState.genres = [];
  filterState.excludedGenres = [];
  renderGenreOptions();
}

export function syncYearInputs(changed) {
  elements.filterYearFrom.value = sanitizeYearInput(elements.filterYearFrom.value);
  elements.filterYearTo.value = sanitizeYearInput(elements.filterYearTo.value);

  let from = Number(elements.filterYearFrom.value);
  let to = Number(elements.filterYearTo.value);

  if (!Number.isNaN(from) && !Number.isNaN(to) && elements.filterYearFrom.value && elements.filterYearTo.value && from > to) {
    if (changed === "from") {
      to = from;
      elements.filterYearTo.value = String(to);
    } else {
      from = to;
      elements.filterYearFrom.value = String(from);
    }
  }

  syncYearLabel();
}

export function syncYearLabel() {
  const from = elements.filterYearFrom.value;
  const to = elements.filterYearTo.value;

  elements.yearRangeLabel.textContent = !from && !to
    ? "Любой год"
    : `${from || "—"} — ${to || "—"}`;
}

function getIncludedGenres() {
  return [...elements.genreOptions.querySelectorAll('.genre-option[data-state="include"]')].map((button) => button.dataset.genre || "");
}

function getExcludedGenres() {
  return [...elements.genreOptions.querySelectorAll('.genre-option[data-state="exclude"]')].map((button) => button.dataset.genre || "");
}

function getGenreState(genre) {
  if (filterState.genres.includes(genre)) {
    return "include";
  }

  if (filterState.excludedGenres.includes(genre)) {
    return "exclude";
  }

  return "neutral";
}

function getGenreStateLabel(stateName) {
  if (stateName === "include") {
    return "включён";
  }

  if (stateName === "exclude") {
    return "исключён";
  }

  return "не выбран";
}

function cycleGenreState(_button, genre) {
  const currentState = getGenreState(genre);
  const nextState = currentState === "neutral" ? "include" : currentState === "include" ? "exclude" : "neutral";

  filterState.genres = filterState.genres.filter((item) => item !== genre);
  filterState.excludedGenres = filterState.excludedGenres.filter((item) => item !== genre);

  if (nextState === "include") {
    filterState.genres = [...filterState.genres, genre].sort((a, b) => a.localeCompare(b, "ru"));
  }

  if (nextState === "exclude") {
    filterState.excludedGenres = [...filterState.excludedGenres, genre].sort((a, b) => a.localeCompare(b, "ru"));
  }

  renderGenreOptions();
}
