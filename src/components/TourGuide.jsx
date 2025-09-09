import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/TourGuide.css";

export default function TourGuide({
  steps = [],
  isOpen = false,
  onFinish,          // called when final step completes
  onSkip,            // called when user skips
  onStepChange,      // optional
  nextLabel = "Next",
  doneLabel = "Finish",
  skipLabel = "Skip",
}) {
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState(null);
  const clickCleanupRef = useRef(null);
  const elevatedRef = useRef(null);

  const compute = () => {
    const s = steps[idx];
    if (!s) { setPos(null); return; }
    const el = document.querySelector(s.selector);
    if (!el) { setPos(null); return; }

    // Keep it in view (friendly on mobile)
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    const r = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const vw = window.innerWidth;
    let top = r.top + scrollY;
    let left = r.right + scrollX + 16;
    if (left + 340 > vw + scrollX) {
      left = r.left + scrollX;
      top = r.bottom + scrollY + 12;
    }

    setPos({
      top,
      left,
      rectTop: r.top + scrollY,
      rectLeft: r.left + scrollX,
      rectW: r.width,
      rectH: r.height,
    });
  };

  // Reset step when opening
  useEffect(() => {
    if (isOpen) setIdx(0);
  }, [isOpen]);

  // Add/remove elevate class to the current target so it sits ABOVE the dim backdrop
  useLayoutEffect(() => {
    if (!isOpen || !steps[idx]) return;

    // clear previous elevated element
    if (elevatedRef.current) {
      elevatedRef.current.classList.remove("tg-elevate");
      elevatedRef.current = null;
    }

    const el = document.querySelector(steps[idx].selector);
    if (el) {
      el.classList.add("tg-elevate");     // undim the current target
      elevatedRef.current = el;
    }

    compute();
    onStepChange && onStepChange(idx, steps[idx]);

    // Wire click-to-advance for waitForClick steps
    if (clickCleanupRef.current) {
      clickCleanupRef.current();
      clickCleanupRef.current = null;
    }
    if (steps[idx]?.waitForClick && el) {
      const onClick = () => {
        if (idx < steps.length - 1) {
          setIdx((i) => i + 1);
        } else {
          onFinish && onFinish();
        }
      };
      el.addEventListener("click", onClick, { once: true });
      clickCleanupRef.current = () => el.removeEventListener("click", onClick);
    }

    return () => {
      if (clickCleanupRef.current) {
        clickCleanupRef.current();
        clickCleanupRef.current = null;
      }
    };
  }, [isOpen, idx, steps, onFinish]);

  // Reposition while open
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => compute();
    const onScroll = () => compute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isOpen, idx]);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("tg-open");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("tg-open");
      if (elevatedRef.current) {
        elevatedRef.current.classList.remove("tg-elevate");
        elevatedRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen || !steps.length) return null;

  const s = steps[idx];
  const hasNext = idx < steps.length - 1;

  const handleNext = () => {
    if (s?.waitForClick) return; // user must click the target for this step
    if (hasNext) {
      setIdx((i) => i + 1);
    } else {
      onFinish && onFinish();
    }
  };
  
  const handleSkip = () => onSkip && onSkip();

  return (
    <>
      {/* Backdrop dims everything */}
      <div className="tg-backdrop" onClick={handleSkip} />

      {/* Spotlight effect that creates a "hole" around the target */}
      {pos && (
        <div
          className="tg-spotlight"
          style={{
            top: (pos.rectTop ?? 0) - 12,
            left: (pos.rectLeft ?? 0) - 12,
            width: (pos.rectW ?? 0) + 24,
            height: (pos.rectH ?? 0) + 24,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip box */}
      <div
        className="tg-box"
        style={{
          top: (pos?.top ?? (window.scrollY + 120)),
          left: (pos?.left ?? 24),
          opacity: 1,
        }}
        role="dialog"
        aria-live="polite"
      >
        <div className="tg-title">{s?.title}</div>
        {s?.body && <div className="tg-body">{s.body}</div>}

        <div className="tg-actions">
          <button className="tg-skip" onClick={handleSkip}>
            {skipLabel}
          </button>
          <div className="tg-spacer" />
          {!s?.hideNext && (
            <button className="tg-next" onClick={handleNext} disabled={s?.waitForClick}>
              {hasNext ? nextLabel : doneLabel}
            </button>
          )}
        </div>
        
        {/* Step counter */}
        <div className="tg-progress">
          <div className="tg-step-counter">
            {idx + 1} of {steps.length}
          </div>
          <div className="tg-progress-bar">
            <div 
              className="tg-progress-fill" 
              style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}