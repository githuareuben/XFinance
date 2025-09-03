import { useState, useRef, useEffect } from "react";
import LottieIcon from "./components/LottieIcon";
import coinsAnim from "./assets/wired-gradient-298-coins-hover-jump.json";
import savingsPigAnim from "./assets/wired-gradient-453-savings-pig-hover-pinch.json";
import homeAnim from "./assets/wired-gradient-63-home-hover-3d-roll.json";
import Budget from "./Budget";
import Savings from "./Savings";
import { useAuth } from "./library/useAuth";
import { signIn, signOutUser } from "./library/firebase";
import "./App.css";

export default function App() {
  const { user, loading } = useAuth();

  // keep original side-effect (not shown)
  const [count, setCount] = useState(0);
  const [screen, setScreen] = useState("home"); // "home" | "savings" | "budget"

  const mainRef = useRef(null);
  useEffect(() => {
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [screen]);

  const buttons = [
    { label: "Home",    icon: <LottieIcon animationData={homeAnim} size={28} />,       onClick: () => { setCount(c=>c+1); setScreen("home"); } },
    { label: "Savings", icon: <LottieIcon animationData={savingsPigAnim} size={28} />, onClick: () => { setCount(c=>c+5); setScreen("savings"); } },
    { label: "Budget",  icon: <LottieIcon animationData={coinsAnim} size={28} />,      onClick: () => { setCount(0);     setScreen("budget"); } },
  ];

  return (
    <>
      {/* Top bar — logo left, buttons centered, name right */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-name">XFinance</span>
        </div>

        <nav className="topbar-center">
          {buttons.map((b, i) => (
            <button key={i} className="circle-btn" aria-label={b.label} title={b.label} onClick={b.onClick}>
              {b.icon}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          {!loading && !user && <button className="link" onClick={signIn}>Sign in</button>}
          {!loading && user && (
            <>
              <span className="user-name">{user.displayName || "Reuben"}</span>
              <button className="link" onClick={signOutUser}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <main className="main" ref={mainRef}>
        {/* Optional global backdrop video */}
        <video className="bg-video" autoPlay muted loop playsInline>
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Screens */}
        {screen === "home" && (
          <section className="home-hero">
            <div className="home-overlay">
              <div className="home-grid">
                {/* 1/3 — stylized quote */}
                <blockquote className="jung-quote">
                  <div className="jung-quote-text">
                    <span className="quote-mark">“</span>
                    What you resist, persists
                    <span className="quote-mark">”</span>
                  </div>
                  <footer className="jung-quote-author">— Carl Jung</footer>
                </blockquote>

                {/* 2/3 — your image (old man on stool) */}
                <figure className="home-figure">
                  <img
                    src="/old-man-stool.png"
                    alt="Old man sitting on a three-legged stool with wings"
                    className="home-figure-img"
                  />
                </figure>
              </div>
            </div>
          </section>
        )}

        {screen === "savings" && <Savings user={user} />}

        {screen === "budget" && <Budget user={user} />}
      </main>
    </>
  );
}