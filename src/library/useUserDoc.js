import { useEffect, useRef, useState } from "react";
import { ensureDoc, watchDoc, patchDoc } from "./firebase";

/** Sync a Firestore doc with defaults; returns { data, ready, update } */
export function useUserDoc(path, defaults) {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const latestPath = useRef(path);

  useEffect(() => { latestPath.current = path; }, [path]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!path) return;
      await ensureDoc(path, defaults);
      unsub = watchDoc(path, d => { setData(d); setReady(true); });
    })();
    return () => unsub();
  }, [path]);

  const update = async (patch) => {
    if (!latestPath.current) return;
    await patchDoc(latestPath.current, patch);
  };

  return { data, ready, update };
}