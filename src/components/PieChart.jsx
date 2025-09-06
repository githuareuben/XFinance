// PieChart.jsx — spending breakdown pie
// Notes:
// - If no spend data, renders a tiny empty ring
// - Tooltip styled to avoid grey overlay

import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function PieChart({ spends = [] }) {
  // Normalize data: [{name, value}]
  const data = spends
    .filter((s) => (Number(s?.amount) || 0) > 0)
    .map((s) => ({ name: s.label || "Spend", value: Number(s.amount) || 0 }));

  // Fallback when empty
  const chartData = data.length ? data : [{ name: "No spending yet", value: 1 }];

  // Color palette (match bar palette for spending)
  const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#f97316", "#a855f7", "#e11d48"];

  return (
    <div style={{ width: "100%", height: 280, cursor: "default" }}>
      <ResponsiveContainer>
        <RPieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            stroke="rgba(255,255,255,0.9)"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [`$${fmt(v)}`, name]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              background: "rgba(255,255,255,0.95)", // no grey
            }}
          />
          <Legend wrapperStyle={{ color: "var(--accent-muted)" }} iconType="circle" />
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}