import {
  LOGIN_ICON_HTML,
  LOGOUT_ICON_SVG,
  TOAST_ACTION_ICONS,
  TOAST_ICONS,
  dialogs,
  elements,
  state
} from "./context.js";
import { escapeHtml } from "./utils.js";

let toastTimeoutId = 0;

export function isAdmin() {
  return state.currentRole === "admin";
}

export function getUserInitial(user) {
  const source = user?.displayName?.trim() || user?.email || "?";
  return source.charAt(0).toUpperCase() || "?";
}

export function getUserAvatarUrl(user) {
  return user?.photoURL?.trim() || "";
}

export function getUserAvatarMarkup(user, className = "user-avatar") {
  const avatarUrl = getUserAvatarUrl(user);
  const initial = escapeHtml(getUserInitial(user));
  const extraClass = className ? ` ${className}` : "";

  if (avatarUrl) {
    return `<span class="user-avatar${extraClass}"><img src="${escapeHtml(avatarUrl)}" alt=""></span>`;
  }

  return `<span class="user-avatar${extraClass}">${initial}</span>`;
}

export function getCurrentUserLabel() {
  const displayName = state.currentUser?.displayName?.trim();
  return displayName || state.currentUser?.email || "Пользователь";
}

export function getRoleLabel(role) {
  return role === "admin" ? "Администратор" : "Пользователь";
}

export function getUserLabel(user) {
  return user?.displayName?.trim() || user?.email || "Пользователь";
}

export function hasProvider(providerId) {
  return Boolean(state.currentUser?.providerData?.some((provider) => provider?.providerId === providerId));
}

export function showToast(message, type = "info", iconKey = "info") {
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

export function clearToast() {
  clearTimeout(toastTimeoutId);
  elements.toastRegion.innerHTML = "";
}

export function setStatus(message, type = "info", icon = "auth") {
  if (!message) {
    clearToast();
    return;
  }

  showToast(message, type, icon);
}

export function syncBodyModalState() {
  const hasOpenDialog = dialogs.some((dialog) => dialog.open);
  document.body.classList.toggle("modal-open", hasOpenDialog);
}

export function openDialog(dialog) {
  state.lastScrollY = window.scrollY;
  dialog.showModal();
  syncBodyModalState();
  requestAnimationFrame(() => {
    window.scrollTo(0, state.lastScrollY);
  });
}

export function closeAllDialogs() {
  dialogs.forEach((dialog) => {
    if (dialog.open) {
      dialog.close();
    }
  });
}

export function closeAdminDialogs() {
  [elements.movieDialog, elements.editMovieDialog, elements.settingsDialog, elements.ratingDialog, elements.detailsDialog].forEach((dialog) => {
    if (dialog.open) {
      dialog.close();
    }
  });
}

export function renderAuthButton() {
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

export function setAuthPasswordVisibility(isVisible) {
  elements.authPassword.type = isVisible ? "text" : "password";
  elements.toggleAuthPassword.setAttribute("aria-pressed", String(isVisible));
  elements.toggleAuthPassword.setAttribute("aria-label", isVisible ? "Скрыть пароль" : "Показать пароль");
  const icon = elements.toggleAuthPassword.querySelector(".material-symbols-outlined");
  if (icon) {
    icon.textContent = isVisible ? "visibility_off" : "visibility";
  }
}

export function toggleAuthPasswordVisibility() {
  const nextVisible = elements.authPassword.type === "password";
  setAuthPasswordVisibility(nextVisible);
}

export function closeUserMenu() {
  elements.userMenu.hidden = true;
  elements.currentUserBadge.setAttribute("aria-expanded", "false");
}

export function toggleUserMenu(event) {
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

export function handleGlobalClick(event) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  const insideUserMenu = elements.userMenu.contains(target) || elements.currentUserBadge.contains(target);
  if (!insideUserMenu) {
    closeUserMenu();
  }
}
