import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase"; // ✅ use the initialized db from firebase.js

/**
 * Hook for syncing a Firestore document.
 * - Auto-creates the document with `initial` if it doesn't exist.
 * - Always returns safe defaults for new users.
 */
export function useUserDoc(path, initial = {}) {
  const [data, setData] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!path) return;

    const ref = doc(db, path);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          // Create a fresh doc for brand-new users
          await setDoc(ref, initial);
          setData(initial);
          setReady(true);
          return;
        }
        setData(snap.data());
        setReady(true);
      },
      (err) => {
        console.error("useUserDoc onSnapshot error:", err);
        setData(initial);
        setReady(true);
      }
    );

    return unsub;
  }, [path]);

  // Merge-patch helper
  const update = async (patch) => {
    if (!path) return;
    const ref = doc(db, path);
    await updateDoc(ref, patch);
  };

  return { data, ready, update };
}