// PieChart.jsx — spending breakdown pie
// Notes:
// - If no spend data, renders a tiny empty ring
// - Tooltip styled to avoid grey overlay
// - Enhanced colors matching the main budget component

import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function PieChart({ spends = [] }) {
  // Normalize data: [{name, value}]
  const data = spends
    .filter((s) => (Number(s?.amount) || 0) > 0)
    .map((s) => ({ name: s.label || s.category || "Spend", value: Number(s.amount) || 0 }));

  // Fallback when empty
  const chartData = data.length ? data : [{ name: "No spending yet", value: 1 }];
  const isEmpty = data.length === 0;

  // Enhanced color palette matching budget component (darker versions for expenses)
  const COLORS = [
    "#7C3AED", // purple
    "#DC2626", // red
    "#D97706", // orange
    "#059669", // green
    "#2563EB", // blue
    "#C026D3", // magenta
    "#DC2626", // red variant
    "#7C2D12", // brown
    "#4338CA", // indigo
    "#BE123C", // rose
  ];

  const darken = (hex, amt = 0.15) => {
    try {
      const { h, s, l } = hexToHsl(hex);
      return hslToHex(h, s, Math.max(0, l * (1 - amt)));
    } catch {
      return hex;
    }
  };

  // Enhanced tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && !isEmpty) {
      const data = payload[0];
      return (
        <div className="custom-tooltip">
          <div className="tooltip-header">
            <span 
              className="tooltip-color-indicator" 
              style={{ backgroundColor: data.color }}
            />
            <span className="tooltip-label">{data.name}</span>
          </div>
          <div className="tooltip-value">${fmt(data.value)}</div>
          <div className="tooltip-percentage">
            {((data.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pie-chart-container">
      <div style={{ width: "100%", height: 280, cursor: isEmpty ? "default" : "pointer" }}>
        <ResponsiveContainer>
          <RPieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={isEmpty ? 85 : 60}
              outerRadius={isEmpty ? 90 : 100}
              paddingAngle={isEmpty ? 0 : 2}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isEmpty ? "#e5e7eb" : darken(COLORS[index % COLORS.length], 0.12)}
                  style={{ filter: isEmpty ? "none" : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                outline: "none",
                border: "none",
              }}
            />
            {!isEmpty && (
              <Legend 
                wrapperStyle={{ 
                  color: "var(--tile-fg, #3d2b5c)",
                  fontSize: "12px",
                  paddingTop: "16px"
                }} 
                iconType="circle"
                formatter={(value) => (
                  <span style={{ color: "var(--tile-fg, #3d2b5c)" }}>{value}</span>
                )}
              />
            )}
          </RPieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats below chart */}
      {!isEmpty && (
        <div className="pie-chart-summary">
          <div className="summary-stat">
            <span className="stat-label">Total Spent:</span>
            <span className="stat-value">${fmt(data.reduce((sum, item) => sum + item.value, 0))}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Categories:</span>
            <span className="stat-value">{data.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Largest:</span>
            <span className="stat-value">
              {data.length > 0 ? 
                `${data.reduce((max, item) => item.value > max.value ? item : max, data[0]).name} (${fmt(data.reduce((max, item) => item.value > max.value ? item : max, data[0]).value)})` 
                : "N/A"
              }
            </span>
          </div>
        </div>
      )}
      
      {isEmpty && (
        <div className="empty-state">
          <p>No expenses recorded yet</p>
          <p className="empty-hint">Start adding expenses to see your spending breakdown</p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function fmt(n) {
  return (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function hexToHsl(hex) {
  let r = 0, g = 0, b = 0;
  const m = hex.replace("#", "").match(/.{1,2}/g);
  [r, g, b] = (m || ["7C", "3A", "ED"]).map((v) => parseInt(v, 16));
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  if (s > 1) s /= 100;
  if (l > 1) l /= 100;
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - C / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = C; g = X; b = 0; }
  else if (60 <= h && h < 120) { r = X; g = C; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = C; b = X; }
  else if (180 <= h && h < 240) { r = 0; g = X; b = C; }
  else if (240 <= h && h < 300) { r = X; g = 0; b = C; }
  else { r = C; g = 0; b = X; }
  const to255 = (v) => Math.round((v + m) * 255);
  const hex = (n) => n.toString(16).padStart(2, "0");
  return `#${hex(to255(r))}${hex(to255(g))}${hex(to255(b))}`;
}