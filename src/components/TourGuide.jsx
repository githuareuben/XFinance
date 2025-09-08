import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const [visible, setVisible] = useState(false);
  const boxRef = useRef(null);

  const compute = () => {
    const s = steps[idx];
    if (!s) return setPos(null);
    const el = document.querySelector(s.selector);
    if (!el) { setPos(null); return; }
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const scrollY = window.scrollY || window.pageYOffset;

    let top = r.top + scrollY;
    let left = r.right + 16;
    // If it overflows to the right, drop under the target
    if (left + 320 > vw) {
      left = r.left;
      top = r.bottom + scrollY + 12;
    }
    setPos({ top, left, rect: r });
  };

  // reset index when opened
  useEffect(() => {
    if (isOpen) setIdx(0);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    compute();
    setVisible(true);
    onStepChange && onStepChange(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idx, steps]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idx]);

  if (!isOpen || !steps.length) return null;
  const s = steps[idx];
  const hasNext = idx < steps.length - 1;

  const handleNext = () => {
    if (hasNext) setIdx((i) => i + 1);
    else onFinish && onFinish();
  };
  const handleSkip = () => onSkip && onSkip();

  return (
    <>
      <div className="tg-backdrop" onClick={handleSkip} />
      {!!pos && (
        <div
          className="tg-highlight"
          style={{
            position: "absolute",
            top: pos.rect.top + (window.scrollY || 0) - 8,
            left: pos.rect.left - 8,
            width: pos.rect.width + 16,
            height: pos.rect.height + 16,
            borderRadius: 10,
            border: "2px solid rgba(99,102,241,.9)",
            boxShadow: "0 0 0 6px rgba(99,102,241,.25)",
            pointerEvents: "none",
            zIndex: 40,
          }}
        />
      )}
      <div
        ref={boxRef}
        className="tg-box"
        style={{
          position: "absolute",
          top: (pos?.top ?? window.scrollY + 120),
          left: (pos?.left ?? 24),
          opacity: visible ? 1 : 0,
          transition: "opacity .2s ease",
          background: "white",
          color: "#0f172a",
          borderRadius: 12,
          padding: 14,
          width: 300,
          boxShadow: "0 12px 30px rgba(0,0,0,.2)",
          zIndex: 50,
        }}
      >
        <div className="tg-title" style={{ fontWeight: 700, marginBottom: 6 }}>{s?.title}</div>
        {s?.body && <div className="tg-body" style={{ fontSize: 14, opacity: .9 }}>{s.body}</div>}
        <div className="tg-actions" style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
          <button
            className="tg-skip"
            onClick={handleSkip}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "8px 10px" }}
          >
            {skipLabel}
          </button>
          <div className="tg-spacer" style={{ flex: 1 }} />
          <button
            className="tg-next"
            onClick={handleNext}
            style={{
              background: "#6366f1",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {hasNext ? nextLabel : doneLabel}
          </button>
        </div>
      </div>
    </>
  );
}