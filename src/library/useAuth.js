// src/library/useAuth.js
import { useEffect, useState } from "react";
import {
  watchAuth,
  signIn as googleSignIn,
  signOutUser,
  auth,
} from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Watch Firebase auth state
  useEffect(() => {
    const unsub = watchAuth(u => {
      setUser(u);
      setLoading(false);
    });
    return unsub; // cleanup on unmount
  }, []);

  // Hook-level helpers
  const signIn = () => googleSignIn();            // Google popup
  const signOut = () => signOutUser();            // Sign out
  const resetPassword = (email) =>                // Password reset email
    sendPasswordResetEmail(auth, email);

  // Keep existing API names for compatibility
  return { user, loading, signIn, signOutUser: signOut, resetPassword };
}