import { useMemo } from "react";

const palette = [
  "#6b5b95", "#88b04b", "#ff6f61", "#92a8d1", "#f7cac9",
  "#955251", "#b565a7", "#009b77", "#dd4124", "#45b8ac", "#e94b3c"
];

export default function BudgetCircle({ items, total, cap, remaining, over }) {
  const sized = useMemo(() => {
    const sum = total || 1;
    return items.map((it, i) => ({
      ...it,
      value: Number(it.amount) || 0,
      color: palette[i % palette.length],
      pct: (Number(it.amount) || 0) / sum
    }));
  }, [items, total]);

  const R = 110; // radius
  const S = 18;  // stroke width
  const C = 2 * Math.PI * R;

  let offset = 0;
  const arcs = sized.map((s, i) => {
    const length = C * s.pct;
    const dash = `${length} ${C - length}`;
    const el = (
      <circle
        key={i}
        r={R}
        cx="50%"
        cy="50%"
        fill="transparent"
        stroke={s.color}
        strokeWidth={S}
        strokeDasharray={dash}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
      />
    );
    offset += length;
    return el;
  });

  const capPct = cap > 0 ? Math.min(1, total / cap) : 0;
  const capLen = C * capPct;

  return (
    <div className="donut-card">
      <svg className="donut" viewBox="0 0 300 300" role="img" aria-label="Budget donut">
        <g transform="rotate(-90 150 150)">
          <circle r={R} cx="50%" cy="50%" fill="transparent" stroke="rgba(0,0,0,0.08)" strokeWidth={S} />
          {arcs}
          {cap > 0 && (
            <>
              <circle r={R+S/2+3} cx="50%" cy="50%" fill="transparent" stroke="rgba(0,0,0,0.1)" strokeWidth="3" />
              <circle
                r={R+S/2+3}
                cx="50%"
                cy="50%"
                fill="transparent"
                stroke="var(--ring)"
                strokeWidth="3"
                strokeDasharray={`${capLen} ${C - capLen}`}
              />
            </>
          )}
        </g>

        <g textAnchor="middle">
          <text x="150" y="145" fontSize="16" opacity="0.7">Total</text>
          <text x="150" y="170" fontSize="28" fontWeight="700">${Number(total||0).toFixed(2)}</text>
          {cap > 0 && (
            <text x="150" y="195" fontSize="12" opacity="0.65">
              {over > 0 ? `Over by $${over.toFixed(2)}` : `Remaining $${remaining.toFixed(2)}`}
            </text>
          )}
        </g>
      </svg>

      <div className="legend">
        {items.map((it, i) => (
          <div key={i} className="legend-row">
            <span className="dot" style={{ background: palette[i % palette.length] }} />
            <span className="lbl">{it.label}</span>
            <span className="amt">${Number(it.amount || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}