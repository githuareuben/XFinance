/**
 * App.jsx
 * -------
 * Main application component that handles:
 * - User authentication and routing
 * - Primary navigation with animated Lottie icons
 * - Complete onboarding flow (tour + budget nudge)
 * - Responsive topbar with user profile and help menu
 * 
 * Flow for new users:
 * 1. User logs in -> Auto-starts tour
 * 2. Tour highlights navigation elements (home, savings, budget, profile)
 * 3. After tour completion -> Budget icon gets strong pulse/buzz effect
 * 4. User can click budget icon to go to budget setup or dismiss nudge
 */

import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import LottieIcon from "./components/LottieIcon";
import coinsAnim from "./assets/wired-gradient-298-coins-hover-jump.json";
import savingsPigAnim from "./assets/wired-gradient-453-savings-pig-hover-pinch.json";
import homeAnim from "./assets/wired-gradient-63-home-hover-3d-roll.json";

import Budget from "./pages/Budget";
import Savings from "./pages/Savings";
import Login from "./pages/Login";

import TourGuide from "./components/TourGuide";
import BudgetNudge from "./components/BudgetNudge";
import { useUserDoc } from "./library/useUserDoc";
import { useAuth } from "./library/useAuth";
import "./styles/App.css";
import "./styles/Home.css";

export default function App() {
  // ================================
  // ALL HOOKS MUST BE DECLARED HERE FIRST
  // NO CONDITIONAL RETURNS BEFORE THIS SECTION
  // ================================
  
  const { user, loading, signOutUser } = useAuth();
  const [count, setCount] = useState(0);
  const mainRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // UI state management - all hooks declared together
  const [showHelp, setShowHelp] = useState(false);
  const [forceTour, setForceTour] = useState(false);
  const [showBudgetNudge, setShowBudgetNudge] = useState(false);

  // Track user's onboarding progress - MUST be called every render
  const setupPath = user ? `users/${user.uid}/profile/setup` : null;
  const {
    data: setup = {
      hasDoneTour: false,
      hasDoneBudgetSetup: false,
      hasSeenBudgetNudge: false,
      tourCompletedAsNewUser: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    ready: setupReady,
    update: updateSetup,
  } = useUserDoc(setupPath, {
    hasDoneTour: false,
    hasDoneBudgetSetup: false,
    hasSeenBudgetNudge: false,
    tourCompletedAsNewUser: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // ================================
  // ALL useEffect HOOKS MUST BE HERE
  // ================================

  // Smooth scroll to top on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname]);

  // Auto-show budget nudge for users who completed tour but haven't seen nudge
  useEffect(() => {
    if (user && setupReady && setup && setup.hasDoneTour && !setup.hasSeenBudgetNudge && !showBudgetNudge) {
      // Only show for users who completed tour as new users (not via help menu)
      if (setup.tourCompletedAsNewUser || setup.tourSkippedAsNewUser) {
        const timer = setTimeout(() => {
          setShowBudgetNudge(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, setupReady, setup, showBudgetNudge]);

  // Development helper - reset onboarding state for testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.resetOnboarding = async () => {
        if (updateSetup) {
          try {
            await updateSetup({
              hasDoneTour: false,
              hasDoneBudgetSetup: false,
              hasSeenBudgetNudge: false,
              tourCompletedAsNewUser: false,
              tourSkippedAsNewUser: false,
              updatedAt: Date.now()
            });
            setForceTour(false);
            setShowBudgetNudge(false);
            console.log('✅ Onboarding state reset - refresh page to test tour');
          } catch (error) {
            console.error('Failed to reset onboarding:', error);
          }
        } else {
          console.warn('updateSetup not available - make sure you are logged in');
        }
      };
      
      // Also expose show functions for manual testing
      window.showTour = () => setForceTour(true);
      window.showBudgetNudge = () => setShowBudgetNudge(true);
    }
    
    return () => {
      if (window.resetOnboarding) delete window.resetOnboarding;
      if (window.showTour) delete window.showTour;
      if (window.showBudgetNudge) delete window.showBudgetNudge;
    };
  }, [updateSetup]);

  // ================================
  // NOW CONDITIONAL LOGIC IS SAFE
  // ================================

  // Loading screen - safe to return early now
  if (loading) {
    return (
      <div className="loading-screen" ref={mainRef}>
        <div className="loader" aria-hidden="true"></div>
        <div className="loading-text">Loading…</div>
      </div>
    );
  }

  // Extract friendly user name
  const friendlyUserName = (() => {
    if (!user) return "User";
    const base = (user.displayName?.trim() || user.email?.split("@")[0] || "User").trim();
    const first = base.split(/\s+/)[0] || base;
    return first.charAt(0).toUpperCase() + first.slice(1);
  })();

  // Navigation configuration with proper IDs for tour targeting
  const buttons = [
    {
      label: "Home",
      id: "nav-home",
      icon: <LottieIcon animationData={homeAnim} size={28} />,
      onClick: () => {
        setCount((c) => c + 1);
        navigate("/");
      },
    },
    {
      label: "Savings", 
      id: "nav-savings",
      icon: <LottieIcon animationData={savingsPigAnim} size={28} />,
      onClick: () => {
        setCount((c) => c + 5);
        navigate("/savings");
      },
    },
    {
      label: "Budget",
      id: "nav-budget",
      icon: <LottieIcon animationData={coinsAnim} size={28} />,
      onClick: () => {
        setCount(0);
        navigate("/budget");
      },
    },
  ];

  // Determine when to auto-open tour
  const shouldAutoOpenTour = Boolean(
    user && 
    setupReady && 
    setup && 
    !setup.hasDoneTour && 
    location.pathname !== "/login"
  );

  // Define tour steps with proper selectors
  const tourSteps = [
    {
      selector: ".brand-badge",
      title: "Welcome to XFinance",
      body: "Quick tour: we'll show you where everything lives. You can skip any time.",
    },
    {
      selector: "#nav-home",
      title: "Home Dashboard",
      body: "Your financial overview and quick actions live here. This is your starting point.",
    },
    {
      selector: "#nav-savings",
      title: "Savings Goals",
      body: "Track your savings progress and set new financial goals here.",
    },
    {
      selector: "#nav-budget", 
      title: "Budget Management",
      body: "Create and manage your budgets here. We'll help you set this up after the tour!",
    },
    {
      selector: ".user-badge",
      title: `Hi, ${friendlyUserName}!`,
      body: "Your account settings and logout are here. You can restart this tour anytime from the help menu.",
    },
  ];

  // Tour completion handlers
  const finishTour = async () => {
    if (!updateSetup) return;
    
    try {
      await updateSetup({ 
        hasDoneTour: true, 
        tourCompletedAt: Date.now(),
        tourCompletedAsNewUser: !forceTour, // Track if completed as new user vs manual
        updatedAt: Date.now() 
      });
      setForceTour(false);
      
      // Show budget nudge ONLY for new users who completed tour naturally (not via help menu)
      if (setup && !setup.hasSeenBudgetNudge && !forceTour) {
        setTimeout(() => {
          setShowBudgetNudge(true);
        }, 800);
      }
    } catch (error) {
      console.error('Error finishing tour:', error);
      setForceTour(false);
    }
  };

  const skipTour = async () => {
    if (!updateSetup) return;
    
    try {
      await updateSetup({ 
        hasDoneTour: true, 
        tourSkippedAt: Date.now(),
        tourSkippedAsNewUser: !forceTour, // Track if skipped as new user vs manual
        updatedAt: Date.now() 
      });
      setForceTour(false);
      
      // Show budget nudge ONLY for new users who skipped tour naturally (not via help menu)
      if (setup && !setup.hasSeenBudgetNudge && !forceTour) {
        setTimeout(() => {
          setShowBudgetNudge(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error skipping tour:', error);
      setForceTour(false);
    }
  };

  // Budget nudge handlers - updated for better UX
  const handleBudgetNudgeContinue = async () => {
    setShowBudgetNudge(false);
    if (updateSetup) {
      try {
        await updateSetup({
          hasSeenBudgetNudge: true,
          budgetClickedAt: Date.now(),
          updatedAt: Date.now()
        });
      } catch (error) {
        console.error('Error handling budget nudge continue:', error);
      }
    }
    navigate("/budget");
  };

  const handleBudgetNudgeCancel = async () => {
    setShowBudgetNudge(false);
    if (updateSetup) {
      try {
        await updateSetup({
          hasSeenBudgetNudge: true,
          budgetNudgeCancelledAt: Date.now(),
          updatedAt: Date.now()
        });
      } catch (error) {
        console.error('Error cancelling budget nudge:', error);
      }
    }
  };

  return (
    <>
      {/* Top bar - only when authenticated and not on login */}
      {user && location.pathname !== "/login" && (
        <header className="topbar">
          {/* Left: brand pill */}
          <div className="topbar-left">
            <div className="brand-badge brand-plain" aria-label="Brand">
              <span className="brand-badge__text">XFinance</span>
            </div>
          </div>

          {/* Center: animated navigation buttons */}
          <nav className="topbar-center" aria-label="Primary navigation">
            {buttons.map((button, i) => (
              <button
                key={i}
                id={button.id}
                className="circle-btn"
                aria-label={button.label}
                title={button.label}
                onClick={button.onClick}
              >
                {button.icon}
              </button>
            ))}
          </nav>

          {/* Right: user profile + help + logout */}
          <div className="topbar-right">
            <div className="user-badge user-plain" id="user-profile">
              {/* Account icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Z"
                />
              </svg>
              <span className="user-badge__name">{friendlyUserName}</span>
            </div>

            {/* Help dropdown */}
            <div className="help-menu" style={{ position: "relative" }}>
              <button
                className="icon-btn"
                aria-haspopup="menu"
                aria-expanded={showHelp ? "true" : "false"}
                onClick={() => setShowHelp((s) => !s)}
                title="Help & Support"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 15h-2v-2h2v2Zm2.07-7.75L14 10a2 2 0 00-1 1.73V12h-2v-.5c0-1.1.9-2 2-2 .37 0 .7-.2.88-.5a1 1 0 00-.38-1.38c-.34-.2-.77-.2-1.12 0-.3.18-.5.51-.5.88H9c0-1.31.84-2.5 2.07-2.92 1.77-.6 3.7.49 4.03 2.31.16.83-.18 1.68-.93 2.2Z"
                  />
                </svg>
              </button>
              {showHelp && (
                <div
                  className="menu-popover"
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--menu-bg)",
                    backdropFilter: "blur(6px)",
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 160,
                    boxShadow: "var(--shadow-menu)",
                    zIndex: 30,
                  }}
                >
                  <button
                    className="menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShowHelp(false);
                      setForceTour(true);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Start Tour
                  </button>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              className="icon-btn"
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  signOutUser();
                }
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"
                />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className="main" ref={mainRef}>
        {/* Background video */}
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

      {/* Tour Guide Component */}
      {user && setupReady && (
        <TourGuide
          steps={tourSteps}
          isOpen={forceTour || shouldAutoOpenTour}
          onFinish={finishTour}
          onSkip={skipTour}
          nextLabel="Next"
          doneLabel="Finish Tour"
          skipLabel="Skip Tour"
        />
      )}

      {/* Budget Nudge Component - Modal style for new users */}
      {user && showBudgetNudge && (
        <BudgetNudge
          targetSelector="#nav-budget"
          text="Take control of your finances by setting up personalized budgets, tracking expenses, and achieving your financial goals."
          intensity="strong"
          showAsModal={true}
          onContinue={handleBudgetNudgeContinue}
          onCancel={handleBudgetNudgeCancel}
        />
      )}
    </>
  );
}

/**
 * HomeSection Component
 * ---------------------
 * Simple home page content with inspirational quote and logo
 * Serves as the landing page after user authentication
 */
function HomeSection() {
  return (
    <div className="home">
      <section className="home-hero">
        <blockquote className="home-quote">
          <div className="home-quote-text">
            <span className="home-quote-mark">"</span>
            What you resist, persists
            <span className="home-quote-mark">"</span>
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