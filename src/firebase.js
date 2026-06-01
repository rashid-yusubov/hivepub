import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot
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

const firebaseApp = initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const ADMIN_EMAIL = "rashid221097@gmail.com";

export {
  GoogleAuthProvider,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  linkWithPopup,
  onAuthStateChanged,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  updateEmail,
  updateProfile,
  writeBatch,
  onSnapshot
};
