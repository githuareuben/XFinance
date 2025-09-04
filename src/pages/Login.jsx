import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { useAuth } from "../library/useAuth";   // signIn (Google), resetPassword, user
import { auth } from "../library/firebase";     // Firebase auth instance
import "../styles/Login.css";                   // fullscreen bg + frosted card

export default function Login() {
  const { user, signIn: googleSignIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // If already logged in, go home
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  function clearAlerts() { setMsg(""); setErr(""); }

  async function onLogin(e) {
    e.preventDefault();
    clearAlerts(); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      setMsg("Welcome back!");
    } catch (e) {
      setErr(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(e) {
    e.preventDefault();
    clearAlerts();
    if (pw !== confirmPw) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pw);
      setMsg("Account created — you’re signed in.");
    } catch (e) {
      setErr(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e) {
    e.preventDefault();
    clearAlerts();
    if (!email.trim()) {
      setErr("Enter your email to receive a reset link.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setMsg("Password reset email sent. Check your inbox.");
      setMode("login");
    } catch (e) {
      setErr(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    clearAlerts(); setLoading(true);
    try {
      await googleSignIn();
      setMsg("Signed in with Google.");
    } catch (e) {
      setErr(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      {/* Dark overlay handled in CSS ::before */}

      <div className="login-card" role="region" aria-labelledby="login-title">
        <h1 id="login-title" className="login-title">
          {isLogin && "Login"}
          {isSignup && "Create Account"}
          {isReset && "Forgot Password"}
        </h1>

        {/* Tabs */}
        <div className="login-tabs" role="tablist" aria-label="Auth mode">
          <button
            className={`login-tab ${isLogin ? "active" : ""}`}
            onClick={() => { setMode("login"); clearAlerts(); }}
            role="tab" aria-selected={isLogin}
          >
            Login
          </button>
          <button
            className={`login-tab ${isSignup ? "active" : ""}`}
            onClick={() => { setMode("signup"); clearAlerts(); }}
            role="tab" aria-selected={isSignup}
          >
            Create account
          </button>
          <button
            className={`login-tab ${isReset ? "active" : ""}`}
            onClick={() => { setMode("reset"); clearAlerts(); }}
            role="tab" aria-selected={isReset}
          >
            Forgot?
          </button>
        </div>

        {/* Alerts */}
        <div aria-live="polite">
          {err && <div className="login-alert login-alert-error">{err}</div>}
          {msg && <div className="login-alert login-alert-ok">{msg}</div>}
        </div>

        {/* Forms */}
        {isLogin && (
          <form onSubmit={onLogin} className="login-form">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />

            <label className="login-label">Password</label>
            <div className="login-password-wrap">
              <input
                type={showPw ? "text" : "password"}
                className="login-input"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                className="login-showpw"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Signing in…" : "Login"}
            </button>

            <button type="button" onClick={onGoogle} disabled={loading} className="btn-secondary">
              Continue with Google
            </button>

            <button type="button" onClick={() => setMode("reset")} className="btn-link">
              Forgot password?
            </button>
          </form>
        )}

        {isSignup && (
          <form onSubmit={onSignup} className="login-form">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />

            <label className="login-label">Password</label>
            <div className="login-password-wrap">
              <input
                type={showPw ? "text" : "password"}
                className="login-input"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                required
                placeholder="Create a password"
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                className="login-showpw"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <label className="login-label">Confirm password</label>
            <input
              type={showPw ? "text" : "password"}
              className="login-input"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              required
              placeholder="Re-enter password"
            />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating…" : "Create account"}
            </button>

            <button type="button" onClick={onGoogle} disabled={loading} className="btn-secondary">
              Sign up with Google
            </button>

            <button type="button" onClick={() => setMode("login")} className="btn-link">
              Have an account? Login
            </button>
          </form>
        )}

        {isReset && (
          <form onSubmit={onReset} className="login-form">
            <p className="login-reset-copy">
              Enter your email and we’ll send you a password reset link.
            </p>
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Sending…" : "Send reset email"}
            </button>

            <button type="button" onClick={() => setMode("login")} className="btn-link">
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function normalizeError(err) {
  const m = err?.message || String(err);
  if (m.includes("invalid-credential")) return "Invalid email or password.";
  if (m.includes("email-already-in-use")) return "That email is already in use.";
  if (m.includes("weak-password")) return "Password is too weak (use at least 6+ characters).";
  if (m.includes("user-not-found")) return "No account found for that email.";
  if (m.includes("wrong-password")) return "Incorrect password.";
  if (m.includes("too-many-requests")) return "Too many attempts. Please try again later.";
  return m.replace(/^Firebase:\s*/i, "");
}