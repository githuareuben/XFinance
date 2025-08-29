import { useState } from "react";
import LottieIcon from "./components/LottieIcon";
import coinsAnim from "./assets/wired-gradient-298-coins-hover-jump.json";
import savingsPigAnim from "./assets/wired-gradient-453-savings-pig-hover-pinch.json";
import homeAnim from "./assets/wired-gradient-63-home-hover-3d-roll.json";
import "./App.css";

export default function App() {
  const [count, setCount] = useState(0);

  const buttons = [
    { label: "Home",    icon: <LottieIcon animationData={homeAnim} size={28} />,        onClick: () => setCount(c => c + 1) },
    { label: "Savings", icon: <LottieIcon animationData={savingsPigAnim} size={28} />,  onClick: () => setCount(c => c + 5) },
    { label: "Budget",  icon: <LottieIcon animationData={coinsAnim} size={28} />,       onClick: () => setCount(0) },
  ];

  return (
    <>
      {/* Header */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-name">XFinance</span>
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
          <span className="user-name">Reuben</span>
        </div>
      </header>

      <main className="main">
        <video className="bg-video" autoPlay muted loop playsInline>
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      </main>
            {/* Background video */}

    </>
  );
}