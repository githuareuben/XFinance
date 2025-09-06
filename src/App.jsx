import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import LottieIcon from "./components/LottieIcon";
import coinsAnim from "./assets/wired-gradient-298-coins-hover-jump.json";
import savingsPigAnim from "./assets/wired-gradient-453-savings-pig-hover-pinch.json";
import homeAnim from "./assets/wired-gradient-63-home-hover-3d-roll.json";

import Budget from "./pages/Budget";
import Savings from "./pages/Savings";
import Login from "./pages/Login";

import { useAuth } from "./library/useAuth";
import "./styles/App.css";
import "./styles/Home.css";

export default function App() {
  const { user, loading, signOutUser } = useAuth();
  const [count, setCount] = useState(0);
  const mainRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Smooth scroll to top on route change
  useEffect(() => {
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname]);

  // Center animated nav buttons
  const buttons = [
    {
      label: "Home",
      icon: <LottieIcon animationData={homeAnim} size={28} />,
      onClick: () => { setCount((c) => c + 1); navigate("/"); },
    },
    {
      label: "Savings",
      icon: <LottieIcon animationData={savingsPigAnim} size={28} />,
      onClick: () => { setCount((c) => c + 5); navigate("/savings"); },
    },
    {
      label: "Budget",
      icon: <LottieIcon animationData={coinsAnim} size={28} />,
      onClick: () => { setCount(0); navigate("/budget"); },
    },
  ];

  // Fancy loading screen
  if (loading) {
    return (
      <div className="loading-screen" ref={mainRef}>
        <div className="loader" aria-hidden="true"></div>
        <div className="loading-text">Loading…</div>
      </div>
    );
  }

  // First-name only + capitalized
  const friendlyUserName = (() => {
    const base = (user?.displayName?.trim() || user?.email?.split("@")[0] || "User").trim();
    const first = base.split(/\s+/)[0] || base;
    return first.charAt(0).toUpperCase() + first.slice(1);
  })();

  return (
    <>
      {/* Top bar (horizontal) — only when authenticated and not on /login */}
      {user && location.pathname !== "/login" && (
        <header className="topbar">
          {/* Left: brand pill (opaque, no shadow) */}
          <div className="topbar-left">
            <div className="brand-badge brand-plain" aria-label="Brand">
              <span className="brand-badge__text">XFinance</span>
            </div>
          </div>

          {/* Center: animated circular buttons */}
          <nav className="topbar-center" aria-label="Primary">
            {buttons.map((b, i) => (
              <button
                key={i}
                className="circle-btn"
                aria-label={b.label}
                title={b.label}
                onClick={b.onClick}
              >
                {b.icon}
              </button>
            ))}
          </nav>

          {/* Right: username pill + logout icon */}
          <div className="topbar-right">
            <div className="user-badge user-plain">
              {/* Account SVG (bigger via CSS) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path fill="currentColor" d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Z"/>
              </svg>
              <span className="user-badge__name">{friendlyUserName}</span>
            </div>

            <button
              className="icon-btn"
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  signOutUser();
                }
              }}
              aria-label="Logout"
              title="Logout"
            >
              {/* Logout SVG (bigger via CSS) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path fill="currentColor" d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/>
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className="main" ref={mainRef}>
        {/* Optional global backdrop video */}
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <Routes>
          {/* Public route */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />

          {/* Private routes */}
          {user ? (
            <>
              <Route path="/" element={<HomeSection />} />
              <Route path="/savings" element={<Savings user={user} />} />
              <Route path="/budget" element={<Budget user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </main>
    </>
  );
}

/* Simple home section (kept minimal) */
function HomeSection() {
  return (
    <div className="home">
      <section className="home-hero">
        <blockquote className="home-quote">
          <div className="home-quote-text">
            <span className="home-quote-mark">“</span>
            What you resist, persists
            <span className="home-quote-mark">”</span>
          </div>
          <footer className="home-quote-author">— Carl Jung</footer>
        </blockquote>
      </section>

      <section className="home-picture">
        <img
          src="/logo3.png"
          alt="Old man sitting on a three-legged stool with wings"
          className="home-picture-img"
        />
      </section>
    </div>
  );
}