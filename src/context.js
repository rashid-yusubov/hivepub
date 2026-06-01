import {
  ADMIN_EMAIL,
  addDoc,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  onSnapshot,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  updateEmail,
  updateProfile,
  writeBatch
} from "./firebase.js";

const PREFS_KEY = "movie-night-club-preferences";

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return { tmdbToken: "" };
    }

    const parsed = JSON.parse(raw);
    return {
      tmdbToken: typeof parsed.tmdbToken === "string" ? parsed.tmdbToken : ""
    };
  } catch {
    return { tmdbToken: "" };
  }
}

export const LOGIN_ICON_HTML = '<span class="material-symbols-outlined">login</span>';
export const LOGOUT_ICON_SVG = '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M216-144q-29.7 0-50.85-21.15Q144-186.3 144-216v-528q0-29.7 21.15-50.85Q186.3-816 216-816h264v72H216v528h264v72H216Zm408-168-50.4-51.6L655.2-456H384v-72h271.2l-81.6-92.4L624-672l168 192-168 168Z"/></svg>';
export const TOAST_ICONS = {
  info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Zm1 13q-1.875 0-3.512-.713-1.638-.712-2.85-1.925-1.213-1.212-1.925-2.85Q3 13.875 3 12t.713-3.512q.712-1.638 1.925-2.85 1.212-1.213 2.85-1.925Q10.125 3 12 3t3.513.713q1.637.712 2.85 1.925 1.212 1.212 1.924 2.85Q21 10.125 21 12t-.713 3.513q-.712 1.637-1.925 2.85-1.212 1.212-2.85 1.924Q13.875 21 12 21Z"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.55 18 3.85 12.3l1.425-1.4 4.275 4.275 9.175-9.2 1.425 1.425L9.55 18Z"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17q.425 0 .713-.288Q13 16.425 13 16t-.287-.713Q12.425 15 12 15t-.712.287Q11 15.575 11 16t.288.712Q11.575 17 12 17Zm-1-4h2V7h-2v6Zm1 9q-1.85 0-3.488-.713-1.637-.712-2.862-1.937Q4.425 18.125 3.713 16.488 3 14.85 3 13q0-1.875.713-3.513.712-1.637 1.937-2.862Q6.875 5.4 8.512 4.7 10.15 4 12 4q1.875 0 3.513.7 1.637.7 2.862 1.925 1.225 1.225 1.925 2.862Q21 11.125 21 13q0 1.85-.7 3.488-.7 1.637-1.925 2.862-1.225 1.225-2.862 1.937Q13.875 22 12 22Z"/></svg>'
};
export const TOAST_ACTION_ICONS = {
  auth: '<span class="material-symbols-outlined">login</span>',
  profile: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-480q-66 0-111-45t-45-111q0-66 45-111t111-45q66 0 111 45t45 111q0 66-45 111t-111 45Zm-240 240v-55q0-39 20.5-72t55.5-50q38-19 79-29t85-10q44 0 85 10t79 29q35 17 55.5 50t20.5 72v55H240Z"/></svg>',
  logout: LOGOUT_ICON_SVG,
  movieAdd: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3v18h18V3Zm-8 11H8v-2h3V9h2v3h3v2h-3v3h-2v-3Z"/></svg>',
  movieEdit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.04a.996.996 0 0 0 0-1.41L18.2 3.29a.996.996 0 1 0-1.41 1.41l2.5 2.5a.996.996 0 0 0 1.42.01Z"/></svg>',
  rating: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 21q-.825 0-1.412-.587Q5 19.825 5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413Q17.825 21 17 21H7Zm10-15H7v13h10V6Zm-8 11h2V8H9v9Zm4 0h2V8h-2v9Z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>'
};

export const TMDB_API_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_ROOT = "https://image.tmdb.org/t/p";
export const SETTINGS_DOC_PATH = ["settings", "integrations"];
export const preferences = loadPreferences();

export const state = {
  currentUser: null,
  currentRole: "guest",
  users: [],
  friends: [],
  movies: [],
  tmdbToken: preferences.tmdbToken || "",
  tmdbLanguage: "ru-RU",
  tmdbPosterSize: "w500",
  tmdbAutoProxy: true,
  tmdbUseProxy: false,
  tmdbProxyHost: "",
  tmdbLastProxyUsed: false,
  lastScrollY: 0
};

export const filterState = {
  sortBy: "watched",
  sortDirection: "desc",
  yearFrom: "",
  yearTo: "",
  genres: [],
  excludedGenres: [],
  strictGenreMatch: false
};

export const elements = {
  authDialog: document.querySelector("#auth-dialog"),
  authForm: document.querySelector("#auth-form"),
  authGoogleButton: document.querySelector("#auth-google-button"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  toggleAuthPassword: document.querySelector("#toggle-auth-password"),
  toastRegion: document.querySelector("#toast-region"),
  appShell: document.querySelector("#app-shell"),
  authTrigger: document.querySelector("#auth-trigger"),
  currentUserBadge: document.querySelector("#current-user-badge"),
  userMenu: document.querySelector("#user-menu"),
  logoutButton: document.querySelector("#logout-button"),
  logoutMenuIcon: document.querySelector("#logout-menu-icon"),
  authButtonLabel: document.querySelector("#auth-button-label"),
  authButtonIcon: document.querySelector("#auth-button-icon"),
  friendForm: document.querySelector("#friend-form"),
  friendsList: document.querySelector("#friends-list"),
  movieForm: document.querySelector("#movie-form"),
  movieEditId: document.querySelector("#movie-edit-id"),
  movieSubmitButton: document.querySelector('#movie-form button[type="submit"]'),
  resetMovieFormButton: document.querySelector("#reset-form"),
  ratingsFields: document.querySelector("#ratings-fields"),
  ratingTemplate: document.querySelector("#rating-template"),
  movieList: document.querySelector("#movie-list"),
  searchInput: document.querySelector("#search-input"),
  sortSelect: document.querySelector("#sort-select"),
  sortDirection: document.querySelector("#sort-direction"),
  clearAll: document.querySelector("#clear-all"),
  filterSummary: document.querySelector("#filter-summary"),
  movieDialog: document.querySelector("#movie-dialog"),
  editMovieDialog: document.querySelector("#edit-movie-dialog"),
  editMovieForm: document.querySelector("#edit-movie-form"),
  editMovieId: document.querySelector("#edit-movie-id"),
  editMovieSubmitButton: document.querySelector('#edit-movie-form button[type="submit"]'),
  editRatingsFields: document.querySelector("#edit-ratings-fields"),
  settingsDialog: document.querySelector("#settings-dialog"),
  filterDialog: document.querySelector("#filter-dialog"),
  filterForm: document.querySelector("#filter-form"),
  openFilter: document.querySelector("#open-filter"),
  resetFilter: document.querySelector("#reset-filter"),
  clearGenres: document.querySelector("#clear-genres"),
  filterStrictMatch: document.querySelector("#filter-strict-match"),
  yearRangeLabel: document.querySelector("#year-range-label"),
  genreOptions: document.querySelector("#genre-options"),
  filterYearFrom: document.querySelector("#filter-year-from"),
  filterYearTo: document.querySelector("#filter-year-to"),
  openAddMovie: document.querySelector("#open-add-movie"),
  openSettings: document.querySelector("#open-settings"),
  closeMovieDialog: document.querySelector("#close-movie-dialog"),
  closeEditMovieDialog: document.querySelector("#close-edit-movie-dialog"),
  cancelEditMovie: document.querySelector("#cancel-edit-movie"),
  closeSettingsDialog: document.querySelector("#close-settings-dialog"),
  closeRatingDialog: document.querySelector("#close-rating-dialog"),
  closeDetailsDialog: document.querySelector("#close-details-dialog"),
  closeFilterDialog: document.querySelector("#close-filter-dialog"),
  ratingDialog: document.querySelector("#rating-dialog"),
  ratingForm: document.querySelector("#rating-form"),
  ratingMovieId: document.querySelector("#rating-movie-id"),
  ratingStars: document.querySelector("#rating-stars"),
  ratingValueDisplay: document.querySelector("#rating-value-display"),
  ratingValue: document.querySelector("#rating-value"),
  detailsDialog: document.querySelector("#details-dialog"),
  detailsContent: document.querySelector("#details-content"),
  moviePosterUrl: document.querySelector("#movie-poster"),
  moviePosterFile: document.querySelector("#movie-poster-file"),
  profileForm: document.querySelector("#profile-form"),
  profileDisplayName: document.querySelector("#profile-display-name"),
  profileEmail: document.querySelector("#profile-email"),
  profileEmailHint: document.querySelector("#profile-email-hint"),
  profileEditName: document.querySelector("#profile-edit-name"),
  profileEditEmail: document.querySelector("#profile-edit-email"),
  profileCreatedLabel: document.querySelector("#profile-created-label"),
  profilePasswordProvider: document.querySelector("#profile-password-provider"),
  profileAvatarUrl: document.querySelector("#profile-avatar-url"),
  profileAvatarFile: document.querySelector("#profile-avatar-file"),
  profileAvatarPreview: document.querySelector("#profile-avatar-preview"),
  profileDisplayNameLabel: document.querySelector("#profile-display-name-label"),
  profileEmailLabel: document.querySelector("#profile-email-label"),
  profileProviderList: document.querySelector("#profile-provider-list"),
  profileFocusButton: document.querySelector("#profile-focus-button"),
  linkGoogleButton: document.querySelector("#link-google-button"),
  linkGoogleLabel: document.querySelector("#link-google-label"),
  removeProfileAvatar: document.querySelector("#remove-profile-avatar"),
  settingsTabButtons: document.querySelectorAll("[data-settings-tab]"),
  settingsPanels: document.querySelectorAll("[data-settings-panel]"),
  settingsContent: document.querySelector(".settings-content"),
  settingsTabUsers: document.querySelector("#settings-tab-users"),
  settingsTabTmdb: document.querySelector("#settings-tab-tmdb"),
  editMoviePosterUrl: document.querySelector("#edit-movie-poster"),
  editMoviePosterFile: document.querySelector("#edit-movie-poster-file"),
  movieLookupQuery: document.querySelector("#movie-lookup-query"),
  movieLookupButton: document.querySelector("#movie-lookup-button"),
  movieLookupStatus: document.querySelector("#movie-lookup-status"),
  movieLookupResults: document.querySelector("#movie-lookup-results"),
  tmdbToken: document.querySelector("#tmdb-token"),
  tmdbLanguage: document.querySelector("#tmdb-language"),
  tmdbPosterSize: document.querySelector("#tmdb-poster-size"),
  tmdbAutoProxy: document.querySelector("#tmdb-auto-proxy"),
  tmdbUseProxy: document.querySelector("#tmdb-use-proxy"),
  tmdbProxyHost: document.querySelector("#tmdb-proxy-host"),
  movieTitle: document.querySelector("#movie-title"),
  movieYear: document.querySelector("#movie-year"),
  movieDate: document.querySelector("#movie-date"),
  movieGenre: document.querySelector("#movie-genre"),
  movieNotes: document.querySelector("#movie-notes"),
  editMovieTitle: document.querySelector("#edit-movie-title"),
  editMovieYear: document.querySelector("#edit-movie-year"),
  editMovieDate: document.querySelector("#edit-movie-date"),
  editMovieGenre: document.querySelector("#edit-movie-genre"),
  editMovieNotes: document.querySelector("#edit-movie-notes")
};

export const addMovieRefs = {
  form: () => elements.movieForm,
  dialog: () => elements.movieDialog,
  editId: () => elements.movieEditId,
  submitButton: () => elements.movieSubmitButton,
  title: () => elements.movieTitle,
  year: () => elements.movieYear,
  date: () => elements.movieDate,
  genre: () => elements.movieGenre,
  notes: () => elements.movieNotes,
  posterUrl: () => elements.moviePosterUrl,
  posterFile: () => elements.moviePosterFile,
  ratingsFields: () => elements.ratingsFields,
  clearLookup: true
};

export const editMovieRefs = {
  form: () => elements.editMovieForm,
  dialog: () => elements.editMovieDialog,
  editId: () => elements.editMovieId,
  submitButton: () => elements.editMovieSubmitButton,
  title: () => elements.editMovieTitle,
  year: () => elements.editMovieYear,
  date: () => elements.editMovieDate,
  genre: () => elements.editMovieGenre,
  notes: () => elements.editMovieNotes,
  posterUrl: () => elements.editMoviePosterUrl,
  posterFile: () => elements.editMoviePosterFile,
  ratingsFields: () => elements.editRatingsFields,
  clearLookup: false
};

export const dialogs = [
  elements.authDialog,
  elements.movieDialog,
  elements.editMovieDialog,
  elements.settingsDialog,
  elements.ratingDialog,
  elements.detailsDialog,
  elements.filterDialog
];

export {
  ADMIN_EMAIL,
  addDoc,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  onSnapshot,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  updateEmail,
  updateProfile,
  writeBatch
};

export function savePreferences() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}
