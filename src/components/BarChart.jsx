// src/components/BarChart.jsx
import { useMemo, useState } from "react";

// Enhanced palette (blue-violet shades for income; darker colors for spends to match main component)
const INCOME_COLORS = ["#8A2BE2", "#6A5ACD", "#9C7BFF", "#B69CFF", "#CBB5FF"];
const SPEND_COLORS  = ["#7C3AED", "#DC2626", "#D97706", "#059669", "#2563EB"];

export default function BarChart({ incomes = [], spends = [], target = 0 }) {
  const [hover, setHover] = useState(null);

  const { groups, maxY, legend, totalIncome, totalSpend } = useMemo(() => {
    const sum = (arr) => arr.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const totalIncome = sum(incomes);
    const totalSpend  = sum(spends);
    
    // Include target in max calculation for better scaling
    const maxY = Math.max(totalIncome, totalSpend, target, 1);

    // normalize into stacks (keep label/color per segment)
    const norm = (arr, palette) =>
      arr.map((it, i) => ({ 
        label: it.label || it.source || it.category || "—", 
        value: Number(it.amount) || 0, 
        color: palette[i % palette.length] 
      }));

    const groups = [
      { key: "Income", stacks: norm(incomes, INCOME_COLORS), total: totalIncome },
      { key: "Spends", stacks: norm(spends,  SPEND_COLORS),  total: totalSpend  },
    ];

    const legend = [
      ...uniqueByLabel(incomes).map((l, i) => ({ type: "Income", label: l, color: INCOME_COLORS[i % INCOME_COLORS.length] })),
      ...uniqueByLabel(spends).map((l, i)  => ({ type: "Spend",  label: l, color: SPEND_COLORS[i % SPEND_COLORS.length] })),
    ];

    return { groups, maxY, legend, totalIncome, totalSpend };
  }, [incomes, spends, target]);

  const W = 720, H = 300, PAD = 48;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const groupWidth = innerW / (groups.length + 0.5); // Add space for target line
  const barWidth = Math.min(120, groupWidth * 0.6);

  // y scale
  const y = (v) => innerH * (v / maxY);

  // Target line position
  const targetY = target > 0 ? H - PAD - y(target) : null;

  return (
    <div className="chart-wrap" role="img" aria-label="Income vs Spend Bar Chart">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* axes */}
        <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#ddd" strokeWidth="2" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke="#ddd" strokeWidth="2" />

        {/* y ticks with enhanced styling */}
        {[0.25, 0.5, 0.75, 1].map((t,i)=>(
          <g key={i} opacity=".7">
            <line x1={PAD} x2={W-PAD} y1={H-PAD - innerH*t} y2={H-PAD - innerH*t} stroke="#eee" strokeWidth="1" strokeDasharray="5,5" />
            <text x={PAD-8} y={H-PAD - innerH*t + 4} fontSize="12" fill="#666" textAnchor="end" fontWeight="500">
              ${fmt(maxY*t)}
            </text>
          </g>
        ))}

        {/* Target line */}
        {targetY && (
          <g>
            <line 
              x1={PAD} 
              x2={W-PAD} 
              y1={targetY} 
              y2={targetY} 
              stroke="#ef4444" 
              strokeWidth="3" 
              strokeDasharray="8,4"
              opacity="0.8"
            />
            <text 
              x={W-PAD-8} 
              y={targetY-6} 
              fontSize="12" 
              fill="#ef4444" 
              textAnchor="end" 
              fontWeight="700"
            >
              Target: ${fmt(target)}
            </text>
          </g>
        )}

        {/* bars with enhanced styling */}
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
                    rx={4} ry={4} // rounded corners
                    style={{
                      filter: hover?.id === id ? "brightness(1.1)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={() => setHover({ id, label: s.label, value: s.value, group: g.key })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              {/* group label with total */}
              <text x={x0 + barWidth/2} y={H - PAD + 18} fontSize="14" textAnchor="middle" fill="#555" fontWeight="600">
                {g.key}
              </text>
              <text x={x0 + barWidth/2} y={H - PAD + 32} fontSize="12" textAnchor="middle" fill="#888" fontWeight="500">
                ${fmt(g.total)}
              </text>
            </g>
          );
        })}

        {/* Summary stats in top right */}
        <g>
          <rect x={W-200} y={20} width={180} height={80} fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.1)" strokeWidth="1" rx="8" />
          <text x={W-190} y={38} fontSize="12" fill="#666" fontWeight="600">Summary</text>
          <text x={W-190} y={54} fontSize="11" fill="#333">
            Income: ${fmt(totalIncome)}
          </text>
          <text x={W-190} y={68} fontSize="11" fill="#333">
            Spend: ${fmt(totalSpend)}
          </text>
          <text x={W-190} y={82} fontSize="11" fill={totalIncome >= totalSpend ? "#059669" : "#dc2626"} fontWeight="600">
            {totalIncome >= totalSpend ? "Surplus" : "Deficit"}: ${fmt(Math.abs(totalIncome - totalSpend))}
          </text>
          {target > 0 && (
            <text x={W-190} y={96} fontSize="11" fill={totalSpend <= target ? "#059669" : "#dc2626"} fontWeight="600">
              Target: {totalSpend <= target ? "On track" : `Over by $${fmt(totalSpend - target)}`}
            </text>
          )}
        </g>
      </svg>

      {/* Enhanced legend */}
      <div className="legend-container" style={{ marginTop: 16 }}>
        <div className="legend-row" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {legend.map((l, i) => (
            <div key={i} className="legend-item" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span 
                className="legend-dot" 
                style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: "50%", 
                  background: l.color,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }} 
              />
              <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--tile-fg)" }}>
                {l.type}: {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced tooltip */}
      {hover && (
        <div 
          className="bar-tooltip" 
          role="tooltip"
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            background: "rgba(255, 255, 255, 0.98)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            fontSize: "14px",
            maxWidth: "200px",
            zIndex: 1000
          }}
        >
          <div style={{ fontWeight: "600", color: "var(--tile-fg)", marginBottom: "4px" }}>
            {hover.group} · {hover.label}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--tile-fg)" }}>
            ${fmt(hover.value)}
          </div>
        </div>
      )}
    </div>
  );
}

function uniqueByLabel(arr) {
  const seen = new Set();
  const out = [];
  arr.forEach(it => {
    const l = (it.label || it.source || it.category || "—").trim();
    if (!seen.has(l)) { seen.add(l); out.push(l); }
  });
  return out;
}

const fmt = (n) => (Number(n)||0).toLocaleString(undefined,{maximumFractionDigits:2});