import {
  auth,
  db,
  doc,
  elements,
  GoogleAuthProvider,
  linkWithPopup,
  serverTimestamp,
  setDoc,
  state,
  updateEmail,
  updateProfile
} from "./context.js";
import { formatAccountCreationDate, getReadableError, readFileAsDataUrl } from "./utils.js";
import { hasProvider, isAdmin, setStatus } from "./ui.js";

let ensureUserDocumentCallback = async () => {};
let refreshAppDataCallback = async () => {};

export function configureProfile({ ensureUserDocument, refreshAppData }) {
  ensureUserDocumentCallback = ensureUserDocument;
  refreshAppDataCallback = refreshAppData;
}

export function syncProfileForm() {
  const user = state.currentUser;

  if (!user) {
    elements.profileForm.reset();
    elements.profileDisplayNameLabel.textContent = "Пользователь";
    elements.profileEmailLabel.textContent = "Почта не указана";
    elements.profileProviderList.textContent = "Нет данных";
    elements.profilePasswordProvider.textContent = "Не подключен";
    elements.profileCreatedLabel.textContent = "-";
    elements.profileAvatarPreview.textContent = "?";
    elements.profileAvatarPreview.style.backgroundImage = "";
    return;
  }

  const hasPassword = hasProvider("password");
  const googleLinked = hasProvider("google.com");
  elements.profileDisplayName.value = user.displayName || "";
  elements.profileEmail.value = user.email || "";
  elements.profileAvatarUrl.value = user.photoURL || "";
  elements.profileAvatarFile.value = "";
  elements.profileDisplayNameLabel.textContent = user.displayName || user.email || "Пользователь";
  elements.profileEmailLabel.textContent = user.email || "Почта не указана";
  elements.profileProviderList.textContent = googleLinked ? "Подключен" : "Не подключен";
  elements.profilePasswordProvider.textContent = hasPassword ? "Подключен" : "Не подключен";
  elements.profileCreatedLabel.textContent = formatAccountCreationDate(user.metadata?.creationTime);
  elements.profileEmail.disabled = isAdmin();
  elements.profileEmailHint.textContent = isAdmin()
    ? "Почта администратора зафиксирована, чтобы не сломать доступ к правилам Firebase."
    : "После смены почты может понадобиться повторный вход.";
  elements.profileEditEmail.disabled = isAdmin();
  elements.linkGoogleButton.disabled = googleLinked;
  elements.linkGoogleLabel.textContent = googleLinked ? "Google подключен" : "Подключить Google";
  syncProfileAvatarPreviewFromFields();
}

export function syncProfileAvatarPreview(url = "") {
  const avatarUrl = url || elements.profileAvatarUrl.value.trim();
  const fallback = (state.currentUser?.displayName || state.currentUser?.email || "?").trim().charAt(0).toUpperCase() || "?";
  elements.profileAvatarPreview.textContent = avatarUrl ? "" : fallback;
  elements.profileAvatarPreview.style.backgroundImage = avatarUrl ? `url("${avatarUrl.replace(/"/g, '\\"')}")` : "";
}

export function syncProfileAvatarPreviewFromFields() {
  syncProfileAvatarPreview(elements.profileAvatarUrl.value.trim());
}

export async function handleProfileAvatarFileChange(event) {
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
    setStatus(getReadableError(error), "error", "profile");
  }
}

export function handleRemoveProfileAvatar() {
  elements.profileAvatarUrl.value = "";
  elements.profileAvatarFile.value = "";
  syncProfileAvatarPreview("");
}

export async function handleLinkGoogleAccount() {
  if (!state.currentUser || hasProvider("google.com")) {
    return;
  }

  elements.linkGoogleButton.disabled = true;
  elements.linkGoogleLabel.textContent = "Привязываем Google...";

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await linkWithPopup(state.currentUser, provider);
    await ensureUserDocumentCallback(auth.currentUser);
    await refreshAppDataCallback();
    syncProfileForm();
    setStatus("Google успешно привязан к аккаунту.", "success", "profile");
  } catch (error) {
    setStatus(getReadableError(error), "error", "profile");
    syncProfileForm();
  }
}

export async function handleProfileSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    return;
  }

  const nextDisplayName = elements.profileDisplayName.value.trim();
  const nextEmail = elements.profileEmail.value.trim().toLowerCase();
  const nextPhotoURL = elements.profileAvatarUrl.value.trim();

  if (!nextEmail) {
    setStatus("Введите почту.", "error", "profile");
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
    await refreshAppDataCallback();
    setStatus("Профиль обновлён.", "success", "profile");
  } catch (error) {
    setStatus(getReadableError(error), "error", "profile");
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
