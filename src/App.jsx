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

  useEffect(() => {
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

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

  if (loading) {
    // 🔥 Cooler loading screen (spinner + text)
    return (
      <div className="loading-screen" ref={mainRef}>
        <div className="loader" aria-hidden="true"></div>
        <div className="loading-text">Loading…</div>
      </div>
    );
  }

  // ✅ First name only + capitalize first letter
  const friendlyUserName = (() => {
    const base = (user?.displayName?.trim() || user?.email?.split("@")[0] || "User").trim();
    const first = base.split(/\s+/)[0] || base; // take first token only
    return first.charAt(0).toUpperCase() + first.slice(1);
  })();

  return (
    <>
      {user && location.pathname !== "/login" && (
        <header className="topbar">
          <div className="topbar-left">
            {/* Brand pill (light grey, no shadow) */}
            <div className="brand-badge brand-plain">
              <span className="brand-badge__text">XFinance</span>
            </div>
          </div>

          <nav className="topbar-center">
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

          <div className="topbar-right">
            {/* Username pill with SVG icon (SVG kept; size bumped via CSS) */}
            <div className="user-badge user-plain">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="##4C4C4C">
                <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/>
              </svg>
              <span className="user-badge__name">{friendlyUserName}</span>
            </div>

            {/* Logout button with SVG + confirmation */}
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#4C4C4C">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/>
              </svg>
            </button>
          </div>
        </header>
      )}

      <main className="main" ref={mainRef}>
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />

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