import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/BudgetNudge.css";

export default function BudgetNudge({
  targetSelector = "#nav-budget",
  text = "Ready to take control of your finances? Set up your budget now!",
  offset = { x: 0, y: 12 },              // px offset for the bubble from target's bottom-left
  dismissOnClickTarget = false,          // Changed to false for modal behavior
  autoShow = true,                       // whether to show immediately
  intensity = "normal",                  // "subtle" | "normal" | "strong"
  showAsModal = false,                   // New prop for modal-style display
  onDismiss,                             // callback when user dismisses the nudge
  onTargetClick,                         // callback when target is clicked
  onContinue,                            // callback for continue action (modal only)
  onCancel,                              // callback for cancel action (modal only)
}) {
  const [pos, setPos] = useState(null);  // { top, left } for bubble
  const [isVisible, setIsVisible] = useState(autoShow);
  const targetRef = useRef(null);
  const roRef = useRef(null);
  const pulseTimeoutRef = useRef(null);

  // Compute and cache target element + bubble position
  const compute = () => {
    const el = document.querySelector(targetSelector);
    if (!el) {
      setPos(null);
      targetRef.current = null;
      return;
    }
    targetRef.current = el;

    const r = el.getBoundingClientRect();
    const top = r.bottom + (window.scrollY || window.pageYOffset) + offset.y;
    const left = r.left + (window.scrollX || window.pageXOffset) + offset.x;
    setPos({ top, left });
  };

  // Show/hide the nudge externally
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  // Expose methods for parent components
  useEffect(() => {
    if (window.budgetNudge) {
      window.budgetNudge.show = show;
      window.budgetNudge.hide = hide;
    } else {
      window.budgetNudge = { show, hide };
    }
    return () => {
      if (window.budgetNudge) {
        delete window.budgetNudge;
      }
    };
  }, []);

  // Initial mount + add pulse class
  useLayoutEffect(() => {
    if (!isVisible) return;

    compute();

    const el = document.querySelector(targetSelector);
    if (el) {
      // Add intensity-based pulse class
      el.classList.add("budget-nudge-pulse");
      el.classList.add(`budget-nudge-pulse--${intensity}`);
      
      // Add a slight delay before starting the buzz effect for stronger intensity
      if (intensity === "strong") {
        pulseTimeoutRef.current = setTimeout(() => {
          el.classList.add("budget-nudge-buzz");
        }, 500);
      }
    }

    // Optional: observe target size/position changes
    if (window.ResizeObserver && el) {
      roRef.current = new ResizeObserver(() => compute());
      roRef.current.observe(el);
    }

    return () => {
      const t = document.querySelector(targetSelector);
      if (t) {
        t.classList.remove("budget-nudge-pulse");
        t.classList.remove(`budget-nudge-pulse--${intensity}`);
        t.classList.remove("budget-nudge-buzz");
      }
      if (roRef.current) {
        try { roRef.current.disconnect(); } catch {}
        roRef.current = null;
      }
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = null;
      }
    };
  }, [targetSelector, isVisible, intensity]);

  // Reposition on scroll/resize (only for non-modal)
  useEffect(() => {
    if (!isVisible || showAsModal) return;

    const onResize = () => compute();
    const onScroll = () => compute();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isVisible, showAsModal]);

  // Handle target clicks
  useEffect(() => {
    if (!dismissOnClickTarget && !onTargetClick) return;
    const el = targetRef.current;
    if (!el) return;

    const onClick = (e) => {
      if (onTargetClick) {
        onTargetClick(e);
      }
      if (dismissOnClickTarget) {
        setIsVisible(false);
        onDismiss?.();
      }
    };

    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("click", onClick);
    };
  }, [dismissOnClickTarget, onDismiss, onTargetClick]);

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Handle continue (modal only)
  const handleContinue = () => {
    setIsVisible(false);
    onContinue?.();
  };

  // Handle cancel (modal only)
  const handleCancel = () => {
    setIsVisible(false);
    onCancel?.();
  };

  if (!isVisible) return null;

  // Modal-style display
  if (showAsModal) {
    return (
      <>
        {/* Full-screen backdrop */}
        <div className="budget-nudge-modal-backdrop" />
        
        {/* Modal dialog */}
        <div 
          className="budget-nudge-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-setup-title"
        >
          <div className="budget-nudge-modal-content">
            <div className="budget-nudge-modal-icon">
              🎯
            </div>
            <h2 id="budget-setup-title" className="budget-nudge-modal-title">
              Ready to Set Up Your Budget?
            </h2>
            <p className="budget-nudge-modal-text">
              {text}
            </p>
            <div className="budget-nudge-modal-actions">
              <button
                type="button"
                className="budget-nudge-modal-btn budget-nudge-modal-btn--secondary"
                onClick={handleCancel}
              >
                Stay on Home
              </button>
              <button
                type="button"
                className="budget-nudge-modal-btn budget-nudge-modal-btn--primary"
                onClick={handleContinue}
              >
                Continue to Budget
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Regular bubble display
  if (!pos) return null;

  return (
    <div
      className={`budget-nudge-bubble budget-nudge-bubble--${intensity}`}
      style={{ top: pos.top, left: pos.left }}
      role="status"
      aria-live="polite"
    >
      <div className="budget-nudge-text">{text}</div>
      <div className="budget-nudge-actions">
        <button
          type="button"
          className="budget-nudge-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
          title="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}