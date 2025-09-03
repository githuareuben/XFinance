// Firebase core
import { initializeApp } from "firebase/app";
// Auth
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
// Firestore
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, enableIndexedDbPersistence } from "firebase/firestore";

// --- Your Firebase config (from console) ---
const firebaseConfig = {
  apiKey: "AIzaSyD3wfkXEomes0DzFRB8ZpNiSJI96J_m-HE",
  authDomain: "xfinance-3e935.firebaseapp.com",
  projectId: "xfinance-3e935",
  storageBucket: "xfinance-3e935.firebasestorage.app",
  messagingSenderId: "782188007269",
  appId: "1:782188007269:web:8c89b7a9ccad44f2431b8c",
  measurementId: "G-K4XPY909Z0"
};

// Init
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export function signIn() { return signInWithPopup(auth, provider); }
export function signOutUser() { return signOut(auth); }
export function watchAuth(cb) { return onAuthStateChanged(auth, cb); }

// Firestore + offline
export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => { /* ignore multi-tab errors */ });

// Helpers for docs
export async function ensureDoc(path, defaultValue) {
  const ref = doc(db, path);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, defaultValue);
  return ref;
}
export function watchDoc(path, cb) {
  const ref = doc(db, path);
  return onSnapshot(ref, (snap) => cb(snap.exists() ? snap.data() : null));
}
export async function patchDoc(path, patch) {
  const ref = doc(db, path);
  await updateDoc(ref, patch);
}