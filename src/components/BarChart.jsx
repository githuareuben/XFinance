// src/components/BarChart.jsx
import { useMemo, useState } from "react";

// palette (blue-violet shades for income; magenta-red for spends)
const INCOME_COLORS = ["#6A5ACD", "#7B6FE0", "#8A2BE2", "#9B55E8", "#AF7AF0"];
const SPEND_COLORS  = ["#E24A8D", "#F06AA2", "#FF84B5", "#FF5C72", "#E23B54"];

export default function BarChart({ incomes = [], spends = [] }) {
  const [hover, setHover] = useState(null);

  const { groups, maxY, legend } = useMemo(() => {
    const sum = (arr) => arr.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const incomeTotal = sum(incomes);
    const spendTotal  = sum(spends);
    const maxY = Math.max(incomeTotal, spendTotal, 1);

    // normalize into stacks (keep label/color per segment)
    const norm = (arr, palette) =>
      arr.map((it, i) => ({ label: it.label || "—", value: Number(it.amount) || 0, color: palette[i % palette.length] }));

    const groups = [
      { key: "Income", stacks: norm(incomes, INCOME_COLORS), total: incomeTotal },
      { key: "Spends", stacks: norm(spends,  SPEND_COLORS),  total: spendTotal  },
    ];

    const legend = [
      ...uniqueByLabel(incomes).map((l, i) => ({ type: "Income", label: l, color: INCOME_COLORS[i % INCOME_COLORS.length] })),
      ...uniqueByLabel(spends).map((l, i)  => ({ type: "Spend",  label: l, color: SPEND_COLORS[i % SPEND_COLORS.length] })),
    ];

    return { groups, maxY, legend };
  }, [incomes, spends]);

  const W = 640, H = 260, PAD = 36;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const groupWidth = innerW / groups.length;
  const barWidth = Math.min(100, groupWidth * 0.5); // ~100px wide per your req

  // y scale
  const y = (v) => innerH * (v / maxY);

  return (
    <div className="chart-wrap" role="img" aria-label="Income vs Spend">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* axes */}
        <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#ddd" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke="#ddd" />

        {/* y ticks (3) */}
        {[0.33, 0.66, 1].map((t,i)=>(
          <g key={i} opacity=".6">
            <line x1={PAD} x2={W-PAD} y1={H-PAD - innerH*t} y2={H-PAD - innerH*t} stroke="#eee" />
            <text x={8} y={H-PAD - innerH*t + 4} fontSize="10" fill="#666">{fmt(maxY*t)}</text>
          </g>
        ))}

        {/* bars */}
        {groups.map((g, gi) => {
          const x0 = PAD + gi * groupWidth + (groupWidth - barWidth) / 2;
          let acc = 0; // stack height
          return (
            <g key={g.key}>
              {/* stacked rects */}
              {g.stacks.map((s, si) => {
                const h = y(s.value);
                const x = x0;
                const yTop = H - PAD - (acc + h);
                const id = `${g.key}-${si}`;
                acc += h;
                return (
                  <rect
                    key={id}
                    x={x}
                    y={yTop}
                    width={barWidth}
                    height={h}
                    fill={s.color}
                    rx={0} ry={0} // square corners
                    onMouseEnter={() => setHover({ id, label: s.label, value: s.value, group: g.key })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              {/* group label */}
              <text x={x0 + barWidth/2} y={H - PAD + 14} fontSize="12" textAnchor="middle" fill="#555">{g.key}</text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="legend-row" style={{ marginTop: 8, flexWrap: "wrap", gap: 8 }}>
        {legend.map((l, i) => (
          <div key={i} className="legend-item">
            <span className="dot" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* tooltip */}
      {hover && (
        <div className="tooltip" role="tooltip">
          <strong>{hover.group}</strong> · {hover.label}<br />
          ${fmt(hover.value)}
        </div>
      )}
    </div>
  );
}

function uniqueByLabel(arr) {
  const seen = new Set();
  const out = [];
  arr.forEach(it => {
    const l = (it.label || "—").trim();
    if (!seen.has(l)) { seen.add(l); out.push(l); }
  });
  return out;
}
const fmt = (n) => (Number(n)||0).toLocaleString(undefined,{maximumFractionDigits:2});