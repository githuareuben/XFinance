import { useEffect, useState } from "react";
import { watchAuth, signIn, signOutUser } from "./firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => watchAuth(u => { setUser(u); setLoading(false); }), []);
  return { user, loading, signIn, signOutUser };
}