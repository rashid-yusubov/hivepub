import {
  ADMIN_EMAIL,
  auth,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  GoogleAuthProvider,
  onAuthStateChanged,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  state,
  updateDoc
} from "./context.js";
import { getReadableError } from "./utils.js";
import { renderAuthButton, setAuthPasswordVisibility, setStatus } from "./ui.js";

let onSignedInCallback = async () => {};
let onSignedOutCallback = async () => {};
let hasResolvedInitialAuthState = false;

function ensureAuthBootDeferred() {
  if (globalThis.__pidrBoot?.authReady) {
    return globalThis.__pidrBoot;
  }

  let resolve = () => {};
  const authReady = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  globalThis.__pidrBoot = { ...(globalThis.__pidrBoot || {}), authReady, resolveAuthReady: resolve };
  return globalThis.__pidrBoot;
}

export function configureAuth({ onSignedIn, onSignedOut }) {
  onSignedInCallback = onSignedIn;
  onSignedOutCallback = onSignedOut;
}

function showLoading() {
  globalThis.__pidrPreloader?.show?.();
}

function hideLoading() {
  globalThis.__pidrPreloader?.hide?.();
}

function closeAuthDialogIfOpen() {
  const dialog = document.querySelector("#auth-dialog");
  if (dialog && dialog.open) {
    dialog.close();
  }
}

export function subscribeToAuthState() {
  const boot = ensureAuthBootDeferred();
  onAuthStateChanged(auth, async (user) => {
    const isInitial = !hasResolvedInitialAuthState;
    hasResolvedInitialAuthState = true;
    globalThis.__pidrBoot = { ...(globalThis.__pidrBoot || {}), isInitialAuthEvent: isInitial };

    if (!user) {
      state.currentUser = null;
      state.currentRole = "guest";
      state.users = [];
      state.friends = [];
      await onSignedOutCallback();
      renderAuthButton();
      if (isInitial) {
        boot.resolveAuthReady?.();
      }
      return;
    }

    state.currentUser = user;
    setStatus("");

    try {
      await ensureUserDocument(user);
      await onSignedInCallback(user);
    } catch (error) {
      setStatus(getReadableError(error), "error", "auth");
      await signOut(auth);
    } finally {
      if (isInitial) {
        boot.resolveAuthReady?.();
      }
    }
  });
}

export async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;

  if (!email || !password) {
    setStatus("Введите логин и пароль.", "error", "auth");
    return;
  }

  setStatus("Входим...", "info", "auth");

  // `<dialog>` находится в top-layer и может быть выше прелоадера — закрываем сразу.
  closeAuthDialogIfOpen();
  showLoading();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.querySelector("#auth-form").reset();
  } catch (error) {
    setStatus(getReadableError(error), "error", "auth");
    hideLoading();
  }
}

export async function handleGoogleAuth() {
  const button = document.querySelector("#auth-google-button");
  button.disabled = true;
  setStatus("Открываем вход через Google...", "info", "auth");

  closeAuthDialogIfOpen();
  showLoading();
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    document.querySelector("#auth-form").reset();
  } catch (error) {
    setStatus(getReadableError(error), "error", "auth");
    button.disabled = false;
    hideLoading();
  } finally {
    button.disabled = false;
  }
}

export async function handleLogout() {
  showLoading();
  try {
    await signOut(auth);
    setStatus("Вы вышли из аккаунта.", "success", "logout");
  } catch (error) {
    setStatus(getReadableError(error), "error", "logout");
    hideLoading();
    throw error;
  }
}

export function openAuthDialog(openDialog) {
  setStatus("");
  document.querySelector("#auth-password").value = "";
  setAuthPasswordVisibility(false);
  document.querySelector("#auth-google-button").disabled = false;
  const dialog = document.querySelector("#auth-dialog");
  if (!dialog.open) {
    openDialog(dialog);
  }
}

export async function ensureUserDocument(user) {
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
  state.currentRole = data.roleView === "admin" ? "admin" : nextRole;
  await setDoc(userRef, profileData, { merge: true });

  if (user.email === ADMIN_EMAIL && data.roleView !== "admin") {
    await updateDoc(userRef, { roleView: "admin" });
    state.currentRole = "admin";
  }
}

export async function loadUsersFromFirestore() {
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
