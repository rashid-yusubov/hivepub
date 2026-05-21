import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  updateEmail,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA9QsbH3RGj352hHZYIyHq69BPHejB-EiU",
  authDomain: "pidr-48d48.firebaseapp.com",
  projectId: "pidr-48d48",
  storageBucket: "pidr-48d48.firebasestorage.app",
  messagingSenderId: "431648679886",
  appId: "1:431648679886:web:11a5b52bb2844dd2d2ed9f",
  measurementId: "G-QLTZ6YYJT9"
};

const ADMIN_EMAIL = "rashid221097@gmail.com";
const PREFS_KEY = "movie-night-club-preferences";
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const LOGIN_ICON_HTML = '<span class="material-symbols-outlined">login</span>';
const LOGOUT_ICON_SVG = '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M216-144q-29.7 0-50.85-21.15Q144-186.3 144-216v-528q0-29.7 21.15-50.85Q186.3-816 216-816h264v72H216v528h264v72H216Zm408-168-50.4-51.6L655.2-456H384v-72h271.2l-81.6-92.4L624-672l168 192-168 168Z"/></svg>';
const TOAST_ICONS = {
  info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Zm1 13q-1.875 0-3.512-.713-1.638-.712-2.85-1.925-1.213-1.212-1.925-2.85Q3 13.875 3 12t.713-3.512q.712-1.638 1.925-2.85 1.212-1.213 2.85-1.925Q10.125 3 12 3t3.513.713q1.637.712 2.85 1.925 1.212 1.212 1.924 2.85Q21 10.125 21 12t-.713 3.513q-.712 1.637-1.925 2.85-1.212 1.212-2.85 1.924Q13.875 21 12 21Z"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.55 18 3.85 12.3l1.425-1.4 4.275 4.275 9.175-9.2 1.425 1.425L9.55 18Z"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17q.425 0 .713-.288Q13 16.425 13 16t-.287-.713Q12.425 15 12 15t-.712.287Q11 15.575 11 16t.288.712Q11.575 17 12 17Zm-1-4h2V7h-2v6Zm1 9q-1.85 0-3.488-.713-1.637-.712-2.862-1.937Q4.425 18.125 3.713 16.488 3 14.85 3 13q0-1.875.713-3.513.712-1.637 1.937-2.862Q6.875 5.4 8.512 4.7 10.15 4 12 4q1.875 0 3.513.7 1.637.7 2.862 1.925 1.225 1.225 1.925 2.862Q21 11.125 21 13q0 1.85-.7 3.488-.7 1.637-1.925 2.862-1.225 1.225-2.862 1.937Q13.875 22 12 22Z"/></svg>'
};
const TOAST_ACTION_ICONS = {
  auth: '<span class="material-symbols-outlined">login</span>',
  profile: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-480q-66 0-111-45t-45-111q0-66 45-111t111-45q66 0 111 45t45 111q0 66-45 111t-111 45Zm-240 240v-55q0-39 20.5-72t55.5-50q38-19 79-29t85-10q44 0 85 10t79 29q35 17 55.5 50t20.5 72v55H240Z"/></svg>',
  logout: '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="M216-144q-29.7 0-50.85-21.15Q144-186.3 144-216v-528q0-29.7 21.15-50.85Q186.3-816 216-816h264v72H216v528h264v72H216Zm408-168-50.4-51.6L655.2-456H384v-72h271.2l-81.6-92.4L624-672l168 192-168 168Z"/></svg>',
  movieAdd: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3v18h18V3Zm-8 11H8v-2h3V9h2v3h3v2h-3v3h-2v-3Z"/></svg>',
  movieEdit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.04a.996.996 0 0 0 0-1.41L18.2 3.29a.996.996 0 1 0-1.41 1.41l2.5 2.5a.996.996 0 0 0 1.42.01Z"/></svg>',
  rating: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 21q-.825 0-1.412-.587Q5 19.825 5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413Q17.825 21 17 21H7Zm10-15H7v13h10V6Zm-8 11h2V8H9v9Zm4 0h2V8h-2v9Z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>'
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const preferences = loadPreferences();
const SETTINGS_DOC_PATH = ["settings", "integrations"];
const state = {
  currentUser: null,
  currentRole: "guest",
  users: [],
  friends: [],
  movies: [],
  tmdbToken: preferences.tmdbToken || "",
  editingMovieId: null,
  lastScrollY: 0
};

const filterState = {
  sortBy: "watched",
  sortDirection: "desc",
  yearFrom: "",
  yearTo: "",
  genres: [],
  excludedGenres: [],
  strictGenreMatch: false
};

let tmdbGenresMap = null;
let toastTimeoutId = 0;

const elements = {
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
  openProfile: document.querySelector("#open-profile"),
  logoutButton: document.querySelector("#logout-button"),
  logoutMenuIcon: document.querySelector("#logout-menu-icon"),
  authButtonLabel: document.querySelector("#auth-button-label"),
  authButtonIcon: document.querySelector("#auth-button-icon"),
  friendForm: document.querySelector("#friend-form"),
  friendsList: document.querySelector("#friends-list"),
  movieForm: document.querySelector("#movie-form"),
  movieEditId: document.querySelector("#movie-edit-id"),
  movieSubmitButton: document.querySelector('#movie-form button[type="submit"]'),
  ratingsFields: document.querySelector("#ratings-fields"),
  editMovieDialog: document.querySelector("#edit-movie-dialog"),
  editMovieForm: document.querySelector("#edit-movie-form"),
  editMovieId: document.querySelector("#edit-movie-id"),
  editMovieSubmitButton: document.querySelector('#edit-movie-form button[type="submit"]'),
  editRatingsFields: document.querySelector("#edit-ratings-fields"),
  resetMovieFormButton: document.querySelector("#reset-form"),
  movieList: document.querySelector("#movie-list"),
  searchInput: document.querySelector("#search-input"),
  openFilter: document.querySelector("#open-filter"),
  sortSelect: document.querySelector("#sort-select"),
  sortDirection: document.querySelector("#sort-direction"),
  filterSummary: document.querySelector("#filter-summary"),
  clearAll: document.querySelector("#clear-all"),
  ratingTemplate: document.querySelector("#rating-template"),
  movieDialog: document.querySelector("#movie-dialog"),
  settingsDialog: document.querySelector("#settings-dialog"),
  profileDialog: document.querySelector("#profile-dialog"),
  ratingDialog: document.querySelector("#rating-dialog"),
  detailsDialog: document.querySelector("#details-dialog"),
  detailsContent: document.querySelector("#details-content"),
  filterDialog: document.querySelector("#filter-dialog"),
  filterForm: document.querySelector("#filter-form"),
  closeFilterDialog: document.querySelector("#close-filter-dialog"),
  resetFilter: document.querySelector("#reset-filter"),
  clearGenres: document.querySelector("#clear-genres"),
  filterStrictMatch: document.querySelector("#filter-strict-match"),
  yearRangeLabel: document.querySelector("#year-range-label"),
  genreOptions: document.querySelector("#genre-options"),
  filterYearFrom: document.querySelector("#filter-year-from"),
  filterYearTo: document.querySelector("#filter-year-to"),
  openAddMovie: document.querySelector("#open-add-movie"),
  openSettings: document.querySelector("#open-settings"),
  closeProfileDialog: document.querySelector("#close-profile-dialog"),
  closeMovieDialog: document.querySelector("#close-movie-dialog"),
  closeEditMovieDialog: document.querySelector("#close-edit-movie-dialog"),
  cancelEditMovie: document.querySelector("#cancel-edit-movie"),
  closeSettingsDialog: document.querySelector("#close-settings-dialog"),
  closeRatingDialog: document.querySelector("#close-rating-dialog"),
  closeDetailsDialog: document.querySelector("#close-details-dialog"),
  ratingForm: document.querySelector("#rating-form"),
  ratingMovieId: document.querySelector("#rating-movie-id"),
  ratingStars: document.querySelector("#rating-stars"),
  ratingValueDisplay: document.querySelector("#rating-value-display"),
  ratingValue: document.querySelector("#rating-value"),
  ratingDialogTitle: document.querySelector("#rating-dialog-title"),
  moviePosterUrl: document.querySelector("#movie-poster"),
  moviePosterFile: document.querySelector("#movie-poster-file"),
  profileForm: document.querySelector("#profile-form"),
  profileDisplayName: document.querySelector("#profile-display-name"),
  profileEmail: document.querySelector("#profile-email"),
  profileEmailHint: document.querySelector("#profile-email-hint"),
  profileAvatarUrl: document.querySelector("#profile-avatar-url"),
  profileAvatarFile: document.querySelector("#profile-avatar-file"),
  profileAvatarPreview: document.querySelector("#profile-avatar-preview"),
  profileProviderLabel: document.querySelector("#profile-provider-label"),
  profileRoleLabel: document.querySelector("#profile-role-label"),
  linkGoogleButton: document.querySelector("#link-google-button"),
  linkGoogleLabel: document.querySelector("#link-google-label"),
  removeProfileAvatar: document.querySelector("#remove-profile-avatar"),
  editMoviePosterUrl: document.querySelector("#edit-movie-poster"),
  editMoviePosterFile: document.querySelector("#edit-movie-poster-file"),
  movieLookupQuery: document.querySelector("#movie-lookup-query"),
  movieLookupButton: document.querySelector("#movie-lookup-button"),
  movieLookupStatus: document.querySelector("#movie-lookup-status"),
  movieLookupResults: document.querySelector("#movie-lookup-results"),
  tmdbToken: document.querySelector("#tmdb-token"),
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

const addMovieRefs = {
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

const editMovieRefs = {
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

const dialogs = [
  elements.authDialog,
  elements.movieDialog,
  elements.editMovieDialog,
  elements.settingsDialog,
  elements.profileDialog,
  elements.ratingDialog,
  elements.detailsDialog,
  elements.filterDialog
];

init();

function init() {
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.authGoogleButton.addEventListener("click", handleGoogleAuth);
  elements.toggleAuthPassword.addEventListener("click", toggleAuthPasswordVisibility);
  elements.authTrigger.addEventListener("click", handleAuthButtonClick);
  elements.currentUserBadge.addEventListener("click", toggleUserMenu);
  elements.openProfile.addEventListener("click", openProfileDialog);
  elements.logoutButton.addEventListener("click", handleLogoutClick);
  elements.friendForm.addEventListener("submit", handleUserManagementSubmit);
  elements.movieForm.addEventListener("submit", handleMovieSubmit);
  elements.resetMovieFormButton.addEventListener("click", handleMovieFormReset);
  elements.editMovieForm.addEventListener("submit", handleEditMovieSubmit);
  elements.ratingForm.addEventListener("submit", handleRatingSubmit);
  elements.searchInput.addEventListener("input", renderMovies);
  elements.sortSelect.addEventListener("change", handleSortControlsChange);
  elements.sortDirection.addEventListener("click", toggleSortDirection);
  elements.clearAll.addEventListener("click", clearAllData);
  elements.openAddMovie.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    openMovieDialog();
  });
  elements.openSettings.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    closeUserMenu();
    openDialog(elements.settingsDialog);
  });
  elements.profileForm.addEventListener("submit", handleProfileSubmit);
  elements.profileAvatarUrl.addEventListener("input", syncProfileAvatarPreviewFromFields);
  elements.profileAvatarFile.addEventListener("change", handleProfileAvatarFileChange);
  elements.linkGoogleButton.addEventListener("click", handleLinkGoogleAccount);
  elements.removeProfileAvatar.addEventListener("click", handleRemoveProfileAvatar);
  elements.openFilter.addEventListener("click", openFilterDialog);
  elements.movieLookupButton.addEventListener("click", handleMovieLookup);
  elements.movieLookupQuery.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleMovieLookup();
    }
  });
  elements.movieLookupQuery.addEventListener("click", (event) => event.stopPropagation());
  elements.movieLookupQuery.addEventListener("pointerdown", (event) => event.stopPropagation());
  elements.tmdbToken.addEventListener("input", handleTmdbTokenInput);
  elements.closeMovieDialog.addEventListener("click", () => elements.movieDialog.close());
  elements.closeEditMovieDialog.addEventListener("click", () => elements.editMovieDialog.close());
  elements.closeProfileDialog.addEventListener("click", () => elements.profileDialog.close());
  elements.cancelEditMovie.addEventListener("click", () => elements.editMovieDialog.close());
  elements.closeSettingsDialog.addEventListener("click", () => elements.settingsDialog.close());
  elements.closeRatingDialog.addEventListener("click", () => elements.ratingDialog.close());
  elements.closeDetailsDialog.addEventListener("click", () => elements.detailsDialog.close());
  elements.closeFilterDialog.addEventListener("click", () => elements.filterDialog.close());
  elements.filterForm.addEventListener("submit", handleFilterSubmit);
  elements.resetFilter.addEventListener("click", resetFilterState);
  elements.clearGenres.addEventListener("click", clearGenreSelection);
  elements.filterYearFrom.addEventListener("input", () => syncYearSelects("from"));
  elements.filterYearTo.addEventListener("input", () => syncYearSelects("to"));

  dialogs.forEach((dialog) => {
    dialog.addEventListener("close", syncBodyModalState);
    dialog.addEventListener("cancel", (event) => {
      syncBodyModalState();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });

  document.addEventListener("click", handleGlobalClick);

  addMovieRefs.date().value = getTodayInputValue();
  editMovieRefs.date().value = getTodayInputValue();
  resetFilterState({ closeDialog: false, rerender: false });
  populateYearSelects();
  syncFilterForm();
  syncSortControls();
  syncSettingsFields();
  buildRatingStars();
  renderAuthButton();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      state.currentUser = null;
      state.currentRole = "guest";
      state.users = [];
      state.friends = [];
      closeAdminDialogs();
      resetMovieForm(addMovieRefs);
      resetMovieForm(editMovieRefs);
      await refreshGuestData();
      renderAuthButton();
      return;
    }

    state.currentUser = user;
    setAuthStatus("");

    try {
    await ensureUserDocument(user);
    await refreshAppData();
    showLoggedInApp();
    } catch (error) {
    setAuthStatus(getReadableError(error), "error", "auth");
      await signOut(auth);
    }
  });
}

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

async function refreshGuestData() {
  state.tmdbToken = "";
  try {
    await loadMoviesFromFirestore();
  } catch (error) {
    console.error(error);
    state.movies = [];
  }
  renderApp();
}

function savePreferences() {
  localStorage.removeItem(PREFS_KEY);
}

function handleAuthButtonClick() {
  openAuthDialog();
}

function handleLogoutClick() {
  closeUserMenu();
  handleLogout();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    setAuthStatus("Введите логин и пароль.", "error", "auth");
    return;
  }

  setAuthStatus("Входим...", "info", "auth");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    elements.authForm.reset();
  } catch (error) {
    setAuthStatus(getReadableError(error), "error", "auth");
  }
}

async function handleGoogleAuth() {
  elements.authGoogleButton.disabled = true;
  setAuthStatus("Открываем вход через Google...", "info", "auth");

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    elements.authForm.reset();
  } catch (error) {
    setAuthStatus(getReadableError(error), "error", "auth");
  } finally {
    elements.authGoogleButton.disabled = false;
  }
}

async function handleLogout() {
  await signOut(auth);
  setAuthStatus("Вы вышли из аккаунта.", "success", "logout");
}

function setAuthStatus(message, type = "info", icon = "auth") {
  if (!message) {
    clearToast();
    return;
  }

  showToast(message, type, icon);
}

function openAuthDialog() {
  setAuthStatus("");
  elements.authPassword.value = "";
  setAuthPasswordVisibility(false);
  elements.authGoogleButton.disabled = false;
  if (!elements.authDialog.open) {
    openDialog(elements.authDialog);
  }
}

function showLoggedInApp() {
  if (elements.authDialog.open) {
    elements.authDialog.close();
  }
  elements.authPassword.value = "";
  setAuthPasswordVisibility(false);
  syncProfileForm();
  setAuthStatus("Авторизация выполнена.", "success", "auth");
  renderAuthButton();
  syncBodyModalState();
}

function renderAuthButton() {
  const isLoggedIn = Boolean(state.currentUser);
  elements.authTrigger.hidden = isLoggedIn;
  elements.currentUserBadge.hidden = !isLoggedIn;
  elements.userMenu.hidden = true;
  elements.currentUserBadge.setAttribute("aria-expanded", "false");
  elements.authButtonLabel.textContent = "Войти";
  elements.authButtonIcon.innerHTML = LOGIN_ICON_HTML;
  elements.logoutMenuIcon.innerHTML = LOGOUT_ICON_SVG;
  elements.authTrigger.setAttribute("aria-label", "Войти");
  elements.authTrigger.setAttribute("title", "Войти");
  elements.logoutButton.setAttribute("aria-label", "Выйти");
  elements.logoutButton.setAttribute("title", "Выйти");
}

function openProfileDialog() {
  if (!state.currentUser) {
    openAuthDialog();
    return;
  }

  closeUserMenu();
  syncProfileForm();
  openDialog(elements.profileDialog);
}

function syncBodyModalState() {
  const hasOpenDialog = dialogs.some((dialog) => dialog.open);
  document.body.classList.toggle("modal-open", hasOpenDialog);
}

function openDialog(dialog) {
  state.lastScrollY = window.scrollY;
  dialog.showModal();
  syncBodyModalState();
  requestAnimationFrame(() => {
    window.scrollTo(0, state.lastScrollY);
  });
}

function closeAllDialogs() {
  dialogs.forEach((dialog) => {
    if (dialog.open) {
      dialog.close();
    }
  });
}

function isAdmin() {
  return state.currentRole === "admin";
}

function getUserInitial(user) {
  const source = user?.displayName?.trim() || user?.email || "?";
  return source.charAt(0).toUpperCase() || "?";
}

function getUserAvatarUrl(user) {
  return user?.photoURL?.trim() || "";
}

function getUserAvatarMarkup(user, className = "user-avatar") {
  const avatarUrl = getUserAvatarUrl(user);
  const initial = escapeHtml(getUserInitial(user));
  const extraClass = className ? ` ${className}` : "";

  if (avatarUrl) {
    return `<span class="user-avatar${extraClass}"><img src="${escapeHtml(avatarUrl)}" alt=""></span>`;
  }

  return `<span class="user-avatar${extraClass}">${initial}</span>`;
}

function getCurrentUserLabel() {
  const displayName = state.currentUser?.displayName?.trim();
  return displayName || state.currentUser?.email || "Пользователь";
}

function getRoleLabel(role) {
  return role === "admin" ? "Администратор" : "Пользователь";
}

function getUserLabel(user) {
  return user?.displayName?.trim() || user?.email || "Пользователь";
}

function hasProvider(providerId) {
  return Boolean(state.currentUser?.providerData?.some((provider) => provider?.providerId === providerId));
}

async function ensureUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const nextRole = user.email === ADMIN_EMAIL ? "admin" : "user";
  const profileData = {
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    active: true,
    updatedAt: serverTimestamp()
  };

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      ...profileData,
      roleView: nextRole,
      createdAt: serverTimestamp()
    });
    state.currentRole = nextRole;
    return;
  }

  const data = snapshot.data();
  const roleView = data.roleView === "admin" ? "admin" : nextRole;
  state.currentRole = roleView;
  await setDoc(userRef, profileData, { merge: true });

  if (user.email === ADMIN_EMAIL && data.roleView !== "admin") {
    await updateDoc(userRef, { roleView: "admin" });
    state.currentRole = "admin";
  }
}

async function refreshAppData() {
  await loadUsersFromFirestore();
  await loadMoviesFromFirestore();
  await loadTmdbSettingsFromFirestore();
  renderApp();
}

async function loadUsersFromFirestore() {
  const snapshot = await getDocs(collection(db, "users"));
  state.users = snapshot.docs
    .map((item) => ({
      id: item.id,
      email: item.data().email || "",
      displayName: item.data().displayName || "",
      photoURL: item.data().photoURL || "",
      roleView: item.data().roleView === "admin" ? "admin" : "user",
      active: item.data().active !== false
    }))
    .sort((left, right) => (left.displayName || left.email).localeCompare(right.displayName || right.email, "ru"));

  state.friends = state.users.map((user) => user.email);
  const current = state.users.find((user) => user.id === state.currentUser?.uid);
  if (current) {
    state.currentRole = current.roleView;
  }
}

async function loadMoviesFromFirestore() {
  const snapshot = await getDocs(collection(db, "movies"));
  const movies = await Promise.all(snapshot.docs.map(loadMovieSnapshot));
  state.movies = movies.sort((left, right) => compareValues(left.watchedOn || "", right.watchedOn || ""));
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
      userRatings[ratingDoc.id] = {
        label,
        value: Number(ratingData.value)
      };
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

function renderApp() {
  updateRoleUi();
  renderUsersList();
  renderRatingFields(elements.ratingsFields);
  renderRatingFields(elements.editRatingsFields);
  populateYearSelects();
  renderGenreOptions();
  renderMovies();
  syncSortControls();
  renderFilterSummary();
  syncSettingsFields();
  syncProfileForm();
}

function updateRoleUi() {
  elements.currentUserBadge.hidden = !state.currentUser;
  elements.currentUserBadge.innerHTML = state.currentUser
    ? `${getUserAvatarMarkup(state.currentUser, "user-avatar-sm")}<span class="user-badge-name">${escapeHtml(getCurrentUserLabel())}</span>`
    : "";
  elements.openProfile.hidden = !state.currentUser;
  elements.openAddMovie.hidden = !isAdmin();
  elements.openSettings.hidden = !isAdmin();
  elements.clearAll.hidden = !isAdmin();
}

function renderUsersList() {
  elements.friendsList.innerHTML = "";

  if (!state.currentUser) {
    elements.friendsList.append(createEmptyState("Требуется вход", "Список пользователей доступен после авторизации."));
    return;
  }

  if (!state.users.length) {
    elements.friendsList.append(createEmptyState("Пользователей пока нет", "После входа пользователи будут появляться здесь автоматически."));
    return;
  }

  state.users.forEach((user) => {
    const chip = document.createElement("div");
    chip.className = "friend-chip";
    chip.innerHTML = `
      <span class="user-inline">${getUserAvatarMarkup(user, "user-avatar-xs")}<span>${escapeHtml(getUserLabel(user))}</span></span>
      <strong>${escapeHtml(getRoleLabel(user.roleView))}</strong>
    `;
    elements.friendsList.append(chip);
  });
}

function handleUserManagementSubmit(event) {
  event.preventDefault();
  setAuthStatus("Создание и удаление аккаунтов из интерфейса требует Firebase Admin SDK или Cloud Functions. Пока пользователей нужно добавлять в Firebase Authentication.", "info", "users");
}

function renderRatingFields(container) {
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

function renderMovies() {
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
    const rateButtonMeta = currentUserRating
      ? `<span class="rate-user-pill">★ ${Number(currentUserRating).toFixed(1)}</span>`
      : "";

    card.innerHTML = `
      ${renderPoster(movie)}
      <div class="movie-main">
        <div class="movie-copy">
          <div class="movie-title-row">
            <h3>${escapeHtml(movie.title)}</h3>
            ${movie.year ? `<span class="movie-year">${escapeHtml(movie.year)}</span>` : ""}
          </div>
          <p class="movie-meta">${escapeHtml(formatMeta(movie) || "Без жанра и даты")}${totalRatings ? ` • Оценок: ${totalRatings}` : ""}</p>
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

async function handleMovieSubmit(event) {
  await saveMovieForm(event, addMovieRefs, { mode: "create" });
}

async function handleEditMovieSubmit(event) {
  await saveMovieForm(event, editMovieRefs, { mode: "edit" });
}

function getMovieFormRatings(container) {
  const ratingsMap = new Map();

  state.users.forEach((user) => {
    const field = container.querySelector(`[data-friend="${CSS.escape(user.email)}"]`);
    const value = field?.value.trim();
    if (value) {
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
    }
  });

  return ratingsMap;
}

async function saveMovieForm(event, refs, options) {
  event.preventDefault();

  if (!isAdmin()) {
    setAuthStatus("Только администратор может менять фильмы.", "error", "movieEdit");
    return;
  }

  const form = refs.form();
  const formData = new FormData(form);
  const editingMovieId = refs.editId().value.trim();
  const title = (formData.get("title") || "").toString().trim();
  let ratingsMap;
  const poster = await getPosterValue(refs);

  if (!title) {
    setAuthStatus("Введите название фильма.", "error", "movieEdit");
    return;
  }

  try {
    ratingsMap = getMovieFormRatings(refs.ratingsFields());
  } catch (error) {
    setAuthStatus(error instanceof Error ? error.message : "Введите корректные оценки с шагом 0.5.", "error", "rating");
    return;
  }

  const year = (formData.get("year") || "").toString().trim();
  const duplicateIgnoreId = options.mode === "edit" ? editingMovieId : "";
  if (hasDuplicateMovie(title, year, duplicateIgnoreId)) {
    setAuthStatus("Такой фильм уже есть в списке.", "error", options.mode === "edit" ? "movieEdit" : "movieAdd");
    return;
  }

  const payload = {
    title,
    year,
    watchedOn: (formData.get("watchedOn") || "").toString().trim(),
    genre: (formData.get("genre") || "").toString().trim(),
    poster,
    notes: (formData.get("notes") || "").toString().trim(),
    updatedAt: serverTimestamp()
  };

  if (options.mode === "edit") {
    if (!editingMovieId) {
      setAuthStatus("Не удалось определить фильм для редактирования.", "error", "movieEdit");
      return;
    }

    const movieRef = doc(db, "movies", editingMovieId);
    await updateDoc(movieRef, payload);
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
  setAuthStatus(options.mode === "edit" ? `Фильм «${title}» обновлён.` : `Фильм «${title}» добавлен.`, "success", options.mode === "edit" ? "movieEdit" : "movieAdd");
  await refreshAppData();
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

async function handleRatingSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    return;
  }

  const movieId = elements.ratingMovieId.value;
  const movie = state.movies.find((item) => item.id === movieId);
  const value = clampRating(elements.ratingValue.value.trim());

  if (!movie || !value) {
    setAuthStatus("Введите корректную оценку.", "error", "rating");
    return;
  }

  const targetUser = state.users.find((user) => user.id === state.currentUser.uid);
  if (!targetUser) {
    setAuthStatus("Не удалось определить пользователя для оценки.", "error", "rating");
    return;
  }

  await setDoc(doc(db, "movies", movieId, "ratings", targetUser.id), {
    userId: targetUser.id,
    userEmail: targetUser.email,
    userLabel: getUserLabel(targetUser),
    value,
    updatedAt: serverTimestamp()
  });

  elements.ratingForm.reset();
  setRatingStarsValue(0);
  elements.ratingDialog.close();
  setAuthStatus(`Оценка для фильма «${movie.title}» сохранена.`, "success", "rating");
  await refreshAppData();
}

async function removeMovie(movieId) {
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
  setAuthStatus("Фильм удалён из коллекции.", "success", "delete");
  await refreshAppData();
}

async function clearAllData() {
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
  setAuthStatus("Все фильмы и оценки удалены.", "success", "delete");
  await refreshAppData();
}

function openMovieDialog() {
  resetMovieForm(addMovieRefs);
  openDialog(elements.movieDialog);
  requestAnimationFrame(() => {
    elements.movieLookupQuery.focus();
  });
}

function openMovieEditor(movieId) {
  const movie = state.movies.find((item) => item.id === movieId);
  if (!movie || !isAdmin()) {
    return;
  }

  resetMovieForm(editMovieRefs);
  setMovieEditingState(editMovieRefs, movieId);
  fillMovieForm(movie, editMovieRefs);
  openDialog(elements.editMovieDialog);
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

function openRatingDialog(movieId) {
  if (!state.currentUser) {
    openAuthDialog();
    return;
  }

  const movie = state.movies.find((item) => item.id === movieId);
  if (!movie) {
    return;
  }

  elements.ratingMovieId.value = movieId;
  if (elements.ratingDialogTitle) {
    elements.ratingDialogTitle.textContent = `Оценить: ${movie.title}`;
  }

  const existingValue = movie.userRatings?.[state.currentUser.uid]?.value;
  setRatingStarsValue(existingValue ? Number(existingValue) : 0);
  openDialog(elements.ratingDialog);
}

function buildRatingStars() {
  if (!elements.ratingStars) {
    return;
  }

  elements.ratingStars.innerHTML = "";

  for (let star = 1; star <= 10; star += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rating-star";
    button.dataset.star = String(star);
    button.setAttribute("aria-label", `Поставить ${star}`);
    button.innerHTML = '<span class="rating-star-icon" aria-hidden="true"></span>';

    button.addEventListener("mousemove", (event) => {
      paintRatingStars(getStarValueFromPointer(button, event));
    });

    button.addEventListener("mouseleave", () => {
      paintRatingStars(Number(elements.ratingValue.value || 0));
    });

    button.addEventListener("click", (event) => {
      setRatingStarsValue(getStarValueFromPointer(button, event));
    });

    elements.ratingStars.append(button);
  }

  setRatingStarsValue(0);
}

function getStarValueFromPointer(button, event) {
  const starIndex = Number(button.dataset.star || 0);
  const rect = button.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  return offsetX < rect.width / 2 ? starIndex - 0.5 : starIndex;
}

function setRatingStarsValue(value) {
  const normalized = value ? clampRating(String(value)) : 0;
  elements.ratingValue.value = normalized ? normalized.toFixed(1) : "";
  elements.ratingValueDisplay.textContent = normalized ? normalized.toFixed(1) : "0.0";
  paintRatingStars(normalized);
}

function paintRatingStars(value) {
  elements.ratingStars.querySelectorAll(".rating-star").forEach((button) => {
    const starIndex = Number(button.dataset.star || 0);
    let stateName = "empty";

    if (value >= starIndex) {
      stateName = "full";
    } else if (value >= starIndex - 0.5) {
      stateName = "half";
    }

    if (button.dataset.fill !== stateName) {
      button.dataset.fill = stateName;
      const icon = button.querySelector(".rating-star-icon");
      if (icon) {
        icon.innerHTML = getRatingStarSvg(stateName);
      }
    }
  });
}

function getRatingStarSvg(stateName) {
  if (stateName === "full") {
    return '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';
  }

  if (stateName === "half") {
    return '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m606-286-33-144 111-96-146-13-58-136v312l126 77ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';
  }

  return '<svg viewBox="0 -960 960 960" fill="none" stroke="currentColor" stroke-width="72" stroke-linejoin="round"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';
}

function openDetailsDialog(movieId) {
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
  const detailsRateMeta = currentUserRating
    ? `<span class="rate-user-pill details-rate-pill">★ ${Number(currentUserRating).toFixed(1)}</span>`
    : "";

  elements.detailsContent.innerHTML = `
    <div class="details-layout">
      ${renderPoster(movie, "details-poster")}
      <div class="details-main">
        <div class="details-top">
          <div class="details-copy">
            <h3 class="details-title">${escapeHtml(movie.title)}${movie.year ? ` <span>(${escapeHtml(movie.year)})</span>` : ""}</h3>
            <p class="details-subtitle">${escapeHtml(formatMeta(movie) || "Без жанра и даты")}</p>
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

  openDialog(elements.detailsDialog);
}

async function deleteNamedRating(movieId, userId) {
  if (!isAdmin()) {
    return;
  }

  await deleteDoc(doc(db, "movies", movieId, "ratings", userId));
  setAuthStatus("Оценка удалена.", "success", "delete");
  await refreshAppData();
  openDetailsDialog(movieId);
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

function getAverageRating(movie) {
  const values = getAllRatings(movie);
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getAllRatings(movie) {
  const named = Object.values(movie.ratings || {}).map(Number);
  return named.filter((value) => !Number.isNaN(value));
}

function clampRating(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return 0;
  }

  const normalized = Math.min(10, Math.max(1, number));
  if (!Number.isInteger(normalized * 2)) {
    return 0;
  }

  return normalized;
}

function formatMeta(movie) {
  const parts = [];
  if (movie.genre) {
    parts.push(movie.genre);
  }
  if (movie.watchedOn) {
    parts.push(formatDate(movie.watchedOn));
  }
  return parts.join(" • ");
}

function formatDate(value) {
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

function getPosterLabel(movie) {
  if (movie.genre) {
    return movie.genre;
  }
  return "Постер";
}

function renderPoster(movie, extraClass = "") {
  const className = extraClass ? `poster-slot ${extraClass}` : "poster-slot";
  if (movie.poster) {
    return `<div class="${className}"><img src="${escapeHtml(movie.poster)}" alt="Постер: ${escapeHtml(movie.title)}"></div>`;
  }

  return `<div class="${className}">${escapeHtml(getPosterLabel(movie))}</div>`;
}

function createEmptyState(title, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>`;
  return wrapper;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTodayInputValue() {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getAuthProviderLabel() {
  const providerIds = state.currentUser?.providerData?.map((provider) => provider?.providerId).filter(Boolean) || [];
  const labels = [];

  if (providerIds.includes("password")) {
    labels.push("Email / пароль");
  }

  if (providerIds.includes("google.com")) {
    labels.push("Google");
  }

  if (!labels.length) {
    labels.push("Firebase");
  }

  return `Способы входа: ${labels.join(", ")}`;
}

function syncProfileForm() {
  const user = state.currentUser;

  if (!user) {
    elements.profileForm.reset();
    elements.profileAvatarPreview.textContent = "?";
    elements.profileAvatarPreview.style.backgroundImage = "";
    return;
  }

  elements.profileDisplayName.value = user.displayName || "";
  elements.profileEmail.value = user.email || "";
  elements.profileAvatarUrl.value = user.photoURL || "";
  elements.profileAvatarFile.value = "";
  elements.profileProviderLabel.textContent = getAuthProviderLabel();
  elements.profileRoleLabel.textContent = `Роль: ${getRoleLabel(state.currentRole)}`;
  elements.profileEmail.disabled = isAdmin();
  elements.profileEmailHint.textContent = isAdmin()
    ? "Почта администратора зафиксирована, чтобы не сломать доступ к правилам Firebase."
    : "После смены почты может понадобиться повторный вход.";
  elements.linkGoogleButton.disabled = hasProvider("google.com");
  elements.linkGoogleLabel.textContent = hasProvider("google.com") ? "Google уже привязан" : "Привязать Google";
  syncProfileAvatarPreviewFromFields();
}

function syncProfileAvatarPreview(url = "") {
  const avatarUrl = url || elements.profileAvatarUrl.value.trim();
  const fallback = (state.currentUser?.displayName || state.currentUser?.email || "?").trim().charAt(0).toUpperCase() || "?";

  elements.profileAvatarPreview.textContent = avatarUrl ? "" : fallback;
  elements.profileAvatarPreview.style.backgroundImage = avatarUrl ? `url("${avatarUrl.replace(/"/g, '\\"')}")` : "";
}

function syncProfileAvatarPreviewFromFields() {
  syncProfileAvatarPreview(elements.profileAvatarUrl.value.trim());
}

async function handleProfileAvatarFileChange(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) {
    syncProfileAvatarPreviewFromFields();
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    elements.profileAvatarUrl.value = dataUrl;
    syncProfileAvatarPreview(dataUrl);
  } catch (error) {
    setAuthStatus(getReadableError(error), "error", "profile");
  }
}

function handleRemoveProfileAvatar() {
  elements.profileAvatarUrl.value = "";
  elements.profileAvatarFile.value = "";
  syncProfileAvatarPreview("");
}

async function handleLinkGoogleAccount() {
  if (!state.currentUser || hasProvider("google.com")) {
    return;
  }

  elements.linkGoogleButton.disabled = true;
  elements.linkGoogleLabel.textContent = "Привязываем Google...";

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await linkWithPopup(state.currentUser, provider);
    await ensureUserDocument(auth.currentUser);
    await refreshAppData();
    syncProfileForm();
    setAuthStatus("Google успешно привязан к аккаунту.", "success", "profile");
  } catch (error) {
    setAuthStatus(getReadableError(error), "error", "profile");
    syncProfileForm();
  }
}

function handleMovieFormReset() {
  resetMovieForm(addMovieRefs);
}

function clearMovieRatingFields(container) {
  container.querySelectorAll(".rating-input").forEach((input) => {
    input.value = "";
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
    clearLookupUi();
  }
}

function getPosterValue(refs) {
  const urlValue = refs.posterUrl().value.trim();
  const file = refs.posterFile().files?.[0];

  if (file) {
    return readFileAsDataUrl(file);
  }

  return Promise.resolve(urlValue);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Не удалось прочитать файл постера."));
    reader.readAsDataURL(file);
  });
}

function setMovieEditingState(refs, movieId) {
  state.editingMovieId = movieId || null;
  refs.editId().value = movieId || "";
  refs.submitButton().textContent = movieId ? "Сохранить изменения" : "Сохранить";
}

function clearMovieEditingState(refs) {
  setMovieEditingState(refs, "");
}

function closeAdminDialogs() {
  [elements.movieDialog, elements.editMovieDialog, elements.settingsDialog, elements.profileDialog, elements.ratingDialog, elements.detailsDialog].forEach((dialog) => {
    if (dialog.open) {
      dialog.close();
    }
  });
}

function toggleUserMenu(event) {
  event.stopPropagation();
  if (!state.currentUser) {
    return;
  }

  const isOpen = !elements.userMenu.hidden;
  if (isOpen) {
    closeUserMenu();
    return;
  }

  elements.userMenu.hidden = false;
  elements.currentUserBadge.setAttribute("aria-expanded", "true");
}

function closeUserMenu() {
  elements.userMenu.hidden = true;
  elements.currentUserBadge.setAttribute("aria-expanded", "false");
}

function handleGlobalClick(event) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  const insideUserMenu = elements.userMenu.contains(target) || elements.currentUserBadge.contains(target);
  if (!insideUserMenu) {
    closeUserMenu();
  }
}

function showToast(message, type = "info", iconKey = "info") {
  clearTimeout(toastTimeoutId);
  const icon = TOAST_ACTION_ICONS[iconKey] || TOAST_ICONS[type] || TOAST_ICONS.info;
  elements.toastRegion.innerHTML = `
    <div class="toast toast-${escapeHtml(type)}" role="status">
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-text">${escapeHtml(message)}</span>
    </div>
  `;

  toastTimeoutId = window.setTimeout(() => {
    clearToast();
  }, type === "error" ? 5200 : 2600);
}

function clearToast() {
  clearTimeout(toastTimeoutId);
  elements.toastRegion.innerHTML = "";
}

function toggleAuthPasswordVisibility() {
  const nextVisible = elements.authPassword.type === "password";
  setAuthPasswordVisibility(nextVisible);
}

function setAuthPasswordVisibility(isVisible) {
  elements.authPassword.type = isVisible ? "text" : "password";
  elements.toggleAuthPassword.setAttribute("aria-pressed", String(isVisible));
  elements.toggleAuthPassword.setAttribute("aria-label", isVisible ? "Скрыть пароль" : "Показать пароль");
  const icon = elements.toggleAuthPassword.querySelector(".material-symbols-outlined");
  if (icon) {
    icon.textContent = isVisible ? "visibility_off" : "visibility";
  }
}

function normalizeMovieTitle(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru");
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

function openFilterDialog() {
  populateYearSelects();
  syncFilterForm();
  openDialog(elements.filterDialog);
}

function handleFilterSubmit(event) {
  event.preventDefault();
  filterState.yearFrom = elements.filterYearFrom.value.trim();
  filterState.yearTo = elements.filterYearTo.value.trim();
  filterState.genres = getIncludedGenres();
  filterState.excludedGenres = getExcludedGenres();
  filterState.strictGenreMatch = elements.filterStrictMatch.checked;

  elements.filterDialog.close();
  renderApp();
}

function resetFilterState(options = { closeDialog: true, rerender: true }) {
  const bounds = getYearBounds();
  filterState.yearFrom = "";
  filterState.yearTo = "";
  filterState.genres = [];
  filterState.excludedGenres = [];
  filterState.strictGenreMatch = false;

  populateYearSelects();
  syncFilterForm();

  if (options.closeDialog) {
    elements.filterDialog.close();
  }

  if (options.rerender) {
    renderApp();
  }
}

function syncFilterForm() {
  elements.filterYearFrom.value = filterState.yearFrom;
  elements.filterYearTo.value = filterState.yearTo;
  elements.filterStrictMatch.checked = filterState.strictGenreMatch;
  syncYearLabel();
  renderGenreOptions();
}

function renderFilterSummary() {
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

function matchesFilter(movie) {
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

  if (filterState.genres.length) {
    if (filterState.strictGenreMatch) {
      if (!filterState.genres.every((genre) => movieGenres.includes(genre))) {
        return false;
      }
    } else if (!filterState.genres.some((genre) => movieGenres.includes(genre))) {
      return false;
    }
  }

  return true;
}

function compareValues(left, right) {
  return String(right).localeCompare(String(left), "ru", { numeric: true });
}

function getSortDirectionMultiplier() {
  return filterState.sortDirection === "asc" ? -1 : 1;
}

function handleSortControlsChange() {
  filterState.sortBy = elements.sortSelect.value;
  renderApp();
}

function syncSortControls() {
  elements.sortSelect.value = filterState.sortBy;
  const isAscending = filterState.sortDirection === "asc";
  elements.sortDirection.setAttribute("aria-pressed", String(isAscending));
  const label = elements.sortDirection.querySelector(".sort-toggle-label");
  if (label) {
    label.textContent = isAscending ? "↑" : "↓";
  }
}

function toggleSortDirection() {
  filterState.sortDirection = filterState.sortDirection === "asc" ? "desc" : "asc";
  renderApp();
}

function getYearBounds() {
  const years = state.movies
    .map((movie) => Number(movie.year))
    .filter((year) => !Number.isNaN(year));

  if (!years.length) {
    return { min: 1990, max: new Date().getFullYear() };
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years)
  };
}

function getAvailableYears() {
  const bounds = getYearBounds();
  const years = [];

  for (let year = bounds.min; year <= bounds.max; year += 1) {
    years.push(year);
  }

  return years;
}

function populateYearSelects() {
  const bounds = getYearBounds();
  elements.filterYearFrom.placeholder = String(bounds.min);
  elements.filterYearTo.placeholder = String(bounds.max);
}

function renderGenreOptions() {
  const genres = [...new Set(state.movies.flatMap((movie) => (movie.genre || "").split(",")).map((genre) => genre.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ru"));

  elements.genreOptions.innerHTML = "";

  if (!genres.length) {
    elements.genreOptions.append(createEmptyState("Нет жанров", "Жанры появятся после добавления фильмов."));
    return;
  }

  genres.forEach((genre) => {
    const button = document.createElement("button");
    const stateName = getGenreFilterState(genre);
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

function getIncludedGenres() {
  return [...elements.genreOptions.querySelectorAll('.genre-option[data-state="include"]')].map((button) => button.dataset.genre || "");
}

function getExcludedGenres() {
  return [...elements.genreOptions.querySelectorAll('.genre-option[data-state="exclude"]')].map((button) => button.dataset.genre || "");
}

function clearGenreSelection() {
  filterState.genres = [];
  filterState.excludedGenres = [];
  renderGenreOptions();
}

function getGenreFilterState(genre) {
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

function cycleGenreState(button, genre) {
  const currentState = button.dataset.state || "neutral";
  let nextState = "neutral";

  if (currentState === "neutral") {
    nextState = "include";
  } else if (currentState === "include") {
    nextState = "exclude";
  }

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

function syncYearSelects(changed) {
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

function syncYearLabel() {
  const from = elements.filterYearFrom.value;
  const to = elements.filterYearTo.value;
  if (!from && !to) {
    elements.yearRangeLabel.textContent = "Любой год";
    return;
  }

  elements.yearRangeLabel.textContent = `${from || "—"} — ${to || "—"}`;
}

function sanitizeYearInput(value) {
  return String(value).replace(/\D+/g, "").slice(0, 4);
}

function getFilteredMoviesCount() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();

  return state.movies
    .filter((movie) => {
      const haystack = `${movie.title} ${movie.genre || ""} ${movie.notes || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    })
    .filter(matchesFilter)
    .length;
}

function syncSettingsFields() {
  elements.tmdbToken.value = state.tmdbToken || "";
}

async function handleProfileSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    openAuthDialog();
    return;
  }

  const nextDisplayName = elements.profileDisplayName.value.trim();
  const nextEmail = elements.profileEmail.value.trim().toLowerCase();
  const nextPhotoURL = elements.profileAvatarUrl.value.trim();

  if (!nextEmail) {
    setAuthStatus("Укажите почту для аккаунта.", "error", "profile");
    return;
  }

  if (isAdmin() && nextEmail !== (state.currentUser.email || "").trim().toLowerCase()) {
    setAuthStatus("Почту администратора здесь менять нельзя, иначе сломается доступ к правилам Firebase.", "error", "profile");
    return;
  }

  try {
    const profileUpdates = {};
    if ((state.currentUser.displayName || "") !== nextDisplayName) {
      profileUpdates.displayName = nextDisplayName;
    }
    if ((state.currentUser.photoURL || "") !== nextPhotoURL) {
      profileUpdates.photoURL = nextPhotoURL;
    }

    if (Object.keys(profileUpdates).length) {
      await updateProfile(state.currentUser, profileUpdates);
    }

    if (!isAdmin() && nextEmail !== (state.currentUser.email || "").trim().toLowerCase()) {
      await updateEmail(state.currentUser, nextEmail);
    }

    await saveUserProfileDocument({
      email: state.currentUser.email || nextEmail,
      displayName: state.currentUser.displayName || nextDisplayName,
      photoURL: state.currentUser.photoURL || nextPhotoURL
    });

    syncProfileForm();
    elements.profileDialog.close();
    await refreshAppData();
    setAuthStatus("Профиль обновлён.", "success", "profile");
  } catch (error) {
    setAuthStatus(getReadableError(error), "error", "profile");
  }
}

async function saveUserProfileDocument(profile) {
  if (!state.currentUser) {
    return;
  }

  await setDoc(doc(db, "users", state.currentUser.uid), {
    email: profile.email || "",
    displayName: profile.displayName || "",
    photoURL: profile.photoURL || "",
    active: true,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function handleTmdbTokenInput(event) {
  state.tmdbToken = event.currentTarget.value.trim();
  tmdbGenresMap = null;
  clearLookupUi();
  if (!isAdmin()) {
    return;
  }

  try {
    await setDoc(doc(db, ...SETTINGS_DOC_PATH), {
      tmdbToken: state.tmdbToken,
      updatedAt: serverTimestamp(),
      updatedBy: state.currentUser?.email || ""
    }, { merge: true });
    savePreferences();
    setAuthStatus("TMDB ключ сохранён в Firebase.", "success", "auth");
  } catch (error) {
    setAuthStatus("Не удалось сохранить TMDB ключ в Firebase.", "error", "auth");
  }
}

async function handleMovieLookup() {
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

async function searchTmdbMovies(query) {
  const url = new URL(`${TMDB_API_BASE}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ru-RU");
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
      poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : ""
    }));
}

async function fetchTmdbMovieDetails(movieId) {
  const url = new URL(`${TMDB_API_BASE}/movie/${movieId}`);
  url.searchParams.set("language", "ru-RU");
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
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "",
    genre: genres.join(", ")
  };
}

async function getTmdbGenresMap() {
  if (tmdbGenresMap) {
    return tmdbGenresMap;
  }

  const url = new URL(`${TMDB_API_BASE}/genre/movie/list`);
  url.searchParams.set("language", "ru-RU");
  const data = await fetchTmdbJson(url);

  tmdbGenresMap = new Map(
    (Array.isArray(data.genres) ? data.genres : [])
      .filter((genre) => genre && genre.id && genre.name)
      .map((genre) => [genre.id, genre.name])
  );

  return tmdbGenresMap;
}

async function fetchTmdbJson(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${state.tmdbToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("TMDB отклонил токен. Проверьте ключ в настройках.");
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
      ${renderPoster({ title: movie.title, genre: movie.year || "Постер", poster: movie.poster }, "lookup-result-poster")}
      <div class="lookup-result-copy">
        <strong>${escapeHtml(movie.title)}${movie.year ? ` (${escapeHtml(movie.year)})` : ""}</strong>
        <span>${escapeHtml(movie.overview || "Описание пока не найдено.")}</span>
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
      } catch (error) {
        setLookupStatus(error instanceof Error ? error.message : "Не удалось подставить данные фильма.");
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
  fillMovieFormFromLookup(details);
  setLookupStatus(`Данные для фильма «${details.title || movie.title}» подставлены в форму.`);
}

function fillMovieFormFromLookup(movie) {
  addMovieRefs.title().value = movie.title || "";
  addMovieRefs.year().value = movie.year || "";
  addMovieRefs.genre().value = movie.genre || "";
  addMovieRefs.notes().value = movie.notes || "";
  addMovieRefs.posterUrl().value = movie.poster || "";
  addMovieRefs.posterFile().value = "";
}

function setLookupStatus(message) {
  elements.movieLookupStatus.textContent = message;
}

function clearLookupUi() {
  elements.movieLookupQuery.value = "";
  elements.movieLookupResults.innerHTML = "";
  setLookupStatus(state.tmdbToken ? "" : "Для автопоиска добавьте TMDB токен в настройках.");
}

async function loadTmdbSettingsFromFirestore() {
  if (!state.currentUser || !isAdmin()) {
    state.tmdbToken = "";
    return;
  }

  const settingsRef = doc(db, ...SETTINGS_DOC_PATH);
  const snapshot = await getDoc(settingsRef);
  const firestoreToken = snapshot.exists() ? String(snapshot.data().tmdbToken || "").trim() : "";

  if (!firestoreToken && preferences.tmdbToken) {
    state.tmdbToken = preferences.tmdbToken.trim();
    await setDoc(settingsRef, {
      tmdbToken: state.tmdbToken,
      updatedAt: serverTimestamp(),
      updatedBy: state.currentUser.email || ""
    }, { merge: true });
    preferences.tmdbToken = "";
    savePreferences();
    return;
  }

  state.tmdbToken = firestoreToken;
}

function getReadableError(error) {
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
