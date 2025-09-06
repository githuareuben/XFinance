import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function TourGuide({
  steps = [],
  isOpen,
  onClose,
  onStepChange,
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
    if (left + 320 > vw) {
      left = r.left;
      top = r.bottom + scrollY + 12;
    }
    setPos({ top, left, rect: r });
  };

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

  return (
    <>
      <div className="tg-backdrop" onClick={onClose} />
      {!!pos && (
        <div
          className="tg-highlight"
          style={{
            top: pos.rect.top + (window.scrollY || 0) - 8,
            left: pos.rect.left - 8,
            width: pos.rect.width + 16,
            height: pos.rect.height + 16,
          }}
        />
      )}
      <div
        ref={boxRef}
        className="tg-box"
        style={{ top: (pos?.top ?? window.scrollY + 120), left: (pos?.left ?? 24), opacity: visible ? 1 : 0 }}
      >
        <div className="tg-title">{s?.title}</div>
        {s?.body && <div className="tg-body">{s.body}</div>}
        <div className="tg-actions">
          <button className="tg-skip" onClick={onClose}>{skipLabel}</button>
          <div className="tg-spacer" />
          <button className="tg-next" onClick={() => { hasNext ? setIdx(i => i + 1) : onClose(); }}>
            {hasNext ? nextLabel : doneLabel}
          </button>
        </div>
      </div>
    </>
  );
}