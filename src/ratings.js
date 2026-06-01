import {
  collection,
  db,
  doc,
  elements,
  serverTimestamp,
  setDoc,
  state
} from "./context.js";
import { openDialog, setStatus } from "./ui.js";

let refreshAppDataCallback = async () => {};
let openAuthDialogCallback = () => {};

export function configureRatings({ refreshAppData, openAuthDialog }) {
  refreshAppDataCallback = refreshAppData;
  openAuthDialogCallback = openAuthDialog;
}

export function getAllRatings(movie) {
  return Object.values(movie.ratings || {}).map(Number).filter((value) => !Number.isNaN(value));
}

export function getAverageRating(movie) {
  const values = getAllRatings(movie);
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function clampRating(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return 0;
  }

  const normalized = Math.min(10, Math.max(1, number));
  return Number.isInteger(normalized * 2) ? normalized : 0;
}

export function buildRatingStars() {
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

export function openRatingDialog(movieId) {
  if (!state.currentUser) {
    openAuthDialogCallback();
    return;
  }

  const movie = state.movies.find((item) => item.id === movieId);
  if (!movie) {
    return;
  }

  elements.ratingMovieId.value = movieId;
  const existingValue = movie.userRatings?.[state.currentUser.uid]?.value;
  setRatingStarsValue(existingValue ? Number(existingValue) : 0);
  openDialog(elements.ratingDialog);
}

export async function handleRatingSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    return;
  }

  const movieId = elements.ratingMovieId.value;
  const movie = state.movies.find((item) => item.id === movieId);
  const value = clampRating(elements.ratingValue.value.trim());

  if (!movie || !value) {
    setStatus("Введите корректную оценку.", "error", "rating");
    return;
  }

  const targetUser = state.users.find((user) => user.id === state.currentUser.uid);
  if (!targetUser) {
    setStatus("Не удалось определить пользователя для оценки.", "error", "rating");
    return;
  }

  await setDoc(doc(db, "movies", movieId, "ratings", targetUser.id), {
    userId: targetUser.id,
    userEmail: targetUser.email,
    userLabel: targetUser.displayName?.trim() || targetUser.email || "Пользователь",
    value,
    updatedAt: serverTimestamp()
  });

  elements.ratingForm.reset();
  setRatingStarsValue(0);
  elements.ratingDialog.close();
  setStatus(`Оценка для фильма «${movie.title}» сохранена.`, "success", "rating");
  await refreshAppDataCallback();
}

export function setRatingStarsValue(value) {
  const normalized = value ? clampRating(String(value)) : 0;
  elements.ratingValue.value = normalized ? normalized.toFixed(1) : "";
  elements.ratingValueDisplay.textContent = normalized ? normalized.toFixed(1) : "0.0";
  paintRatingStars(normalized);
}

function getStarValueFromPointer(button, event) {
  const starIndex = Number(button.dataset.star || 0);
  const rect = button.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  return offsetX < rect.width / 2 ? starIndex - 0.5 : starIndex;
}

function paintRatingStars(value) {
  elements.ratingStars.querySelectorAll(".rating-star").forEach((button) => {
    const starIndex = Number(button.dataset.star || 0);
    let fill = "empty";

    if (value >= starIndex) {
      fill = "full";
    } else if (value >= starIndex - 0.5) {
      fill = "half";
    }

    if (button.dataset.fill !== fill) {
      button.dataset.fill = fill;
      const icon = button.querySelector(".rating-star-icon");
      if (icon) {
        icon.innerHTML = getRatingStarSvg(fill);
      }
    }
  });
}

function getRatingStarSvg(fill) {
  if (fill === "full") {
    return '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';
  }

  if (fill === "half") {
    return '<svg viewBox="0 -960 960 960" fill="currentColor"><path d="m606-286-33-144 111-96-146-13-58-136v312l126 77ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';
  }

  return '<svg viewBox="0 -960 960 960" fill="none" stroke="currentColor" stroke-width="72" stroke-linejoin="round"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></svg>';
}
