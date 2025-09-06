import { useEffect, useMemo, useState } from "react";
import "../styles/Budget.css";
import { useUserDoc } from "../library/useUserDoc";
import { getPeriod, isInRange, weekNumberMonBased } from "../library/period";
import {
  ResponsiveContainer,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";

/* -----------------------------
   Default Firestore model
------------------------------*/
const DEFAULT_MODEL = {
  schedule: "weekly", // weekly | fortnight | monthly | yearly
  incomes: [],        // [{id, source, amount, ts}]
  expenses: [],       // [{id, category, amount, ts}]
  target: 0,
};

/* -----------------------------
   Stable helpers (no hooks)
------------------------------*/
function sumByKey(arr, key) {
  const out = {};
  for (const it of arr) {
    const k = (it[key] || "Other").trim();
    const v = Number(it.amount || 0);
    if (!isFinite(v)) continue;
    out[k] = (out[k] || 0) + v;
  }
  return out;
}
function sumAmounts(arr) {
  return arr.reduce((s, it) => s + (Number(it.amount) || 0), 0);
}
function fmt(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function toMoney(x) {
  const n = Number(String(x).trim());
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function onlyNumeric(s) {
  // allow digits + one dot
  const cleaned = String(s).replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return parts[0] + "." + parts.slice(1).join(""); // collapse extra dots
}
function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* small color helpers (fixed palette for legend) */
const PALETTE = ["#8A2BE2", "#6A5ACD", "#9C7BFF", "#B69CFF", "#CBB5FF", "#7C59E6", "#5D40C6"];
const darken = (hex, amt = 0.12) => {
  try {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s, Math.max(0, l * (1 - amt)));
  } catch {
    return hex;
  }
};
function hexToHsl(hex) {
  let r = 0, g = 0, b = 0;
  const m = hex.replace("#", "").match(/.{1,2}/g);
  [r, g, b] = (m || ["8A", "2B", "E2"]).map((v) => parseInt(v, 16));
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

export default function Budget({ user }) {
  /* ---------------------------------------
     Hooks (no early returns)
  ----------------------------------------*/
  const uid = user?.uid;
  const path = uid ? `users/${uid}/budget/model` : null;
  const { data, ready, update } = useUserDoc(path, DEFAULT_MODEL);

  const [chartMode, setChartMode] = useState("bar");       // "bar" | "pie"
  const [refDate, setRefDate] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // two-step editors that live INSIDE tiles
  // income editor: step = "source" | "amount"
  const [incomeEditor, setIncomeEditor] = useState(null);
  // expense editor: step = "category" | "amount"
  const [expenseEditor, setExpenseEditor] = useState(null);
  // target editor
  const [targetEditor, setTargetEditor] = useState(null);

  // Ensure the model has schedule after load
  useEffect(() => {
    if (ready && data && !data.schedule) {
      update({ schedule: "weekly" });
    }
  }, [ready, data, update]);

  // Safe fallbacks if not ready
  const schedule = (data?.schedule || "weekly").toLowerCase();
  const period = getPeriod(schedule, refDate);
  const weekNo = weekNumberMonBased(refDate);

  // Current-period entries
  const incomes = data?.incomes ?? [];
  const expenses = data?.expenses ?? [];
  const target = Number(data?.target ?? 0) || 0;

  const incomesCurrent = useMemo(
    () => incomes.filter((e) => isInRange(e.ts, period)),
    [incomes, period]
  );
  const expensesCurrent = useMemo(
    () => expenses.filter((e) => isInRange(e.ts, period)),
    [expenses, period]
  );

  const incomeBySource = useMemo(() => sumByKey(incomesCurrent, "source"), [incomesCurrent]);
  const spendByCategory = useMemo(() => sumByKey(expensesCurrent, "category"), [expensesCurrent]);

  const totalIncome = useMemo(() => sumAmounts(incomesCurrent), [incomesCurrent]);
  const totalSpend = useMemo(() => sumAmounts(expensesCurrent), [expensesCurrent]);

  const remaining = Math.max(0, target - totalSpend);
  const over = Math.max(0, totalSpend - target);

  // Chart data: single row, stacked by sources/categories
  const barData = useMemo(() => {
    const row = { name: "This Period" };
    Object.entries(incomeBySource).forEach(([s, v]) => (row[`$inc:${s}`] = v));
    Object.entries(spendByCategory).forEach(([c, v]) => (row[`$exp:${c}`] = v));
    return [row];
  }, [incomeBySource, spendByCategory]);

  const incKeys = useMemo(() => Object.keys(incomeBySource).map((s) => `$inc:${s}`), [incomeBySource]);
  const expKeys = useMemo(() => Object.keys(spendByCategory).map((c) => `$exp:${c}`), [spendByCategory]);

  /* ---------------------------------------
     Handlers
  ----------------------------------------*/
  const onChangeSchedule = async (e) => {
    await update({ schedule: e.target.value });
  };

  const onPickDate = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split("-").map((n) => parseInt(n, 10));
    setRefDate(new Date(y, m - 1, d));
    setShowCalendar(false);
  };

  // Start 2-step editors
  const startIncomeSource = () => setIncomeEditor({ step: "source", source: "", amount: "" });
  const startExpenseCategory = () => setExpenseEditor({ step: "category", category: "", amount: "" });
  const startTarget = () => setTargetEditor({ amount: String(target || "") });

  // Validate & advance income steps
  const saveIncomeSource = () => {
    if (!incomeEditor) return;
    const src = (incomeEditor.source || "").trim();
    if (!src) return setIncomeEditor({ ...incomeEditor, error: "Please enter a source of income." });
    setIncomeEditor({ step: "amount", source: src, amount: "", error: "" });
  };
  const saveIncomeAmount = async () => {
    if (!incomeEditor) return;
    const amt = toMoney(incomeEditor.amount);
    if (!isFinite(amt) || amt <= 0) {
      return setIncomeEditor({ ...incomeEditor, error: "Please enter a valid amount greater than 0." });
    }
    const now = Date.now();
    await update({
      incomes: [...(data?.incomes || []), { id: `${now}`, source: incomeEditor.source, amount: amt, ts: now }],
    });
    setIncomeEditor(null);
  };

  // Validate & advance expense steps
  const saveExpenseCategory = () => {
    if (!expenseEditor) return;
    const cat = (expenseEditor.category || "").trim();
    if (!cat) return setExpenseEditor({ ...expenseEditor, error: "Please enter a spending category." });
    setExpenseEditor({ step: "amount", category: cat, amount: "", error: "" });
  };
  const saveExpenseAmount = async () => {
    if (!expenseEditor) return;
    const amt = toMoney(expenseEditor.amount);
    if (!isFinite(amt) || amt <= 0) {
      return setExpenseEditor({ ...expenseEditor, error: "Please enter a valid amount greater than 0." });
    }
    const now = Date.now();
    await update({
      expenses: [...(data?.expenses || []), { id: `${now}`, category: expenseEditor.category, amount: amt, ts: now }],
    });
    setExpenseEditor(null);
  };

  // Save target
  const saveTarget = async () => {
    if (!targetEditor) return;
    const amt = toMoney(targetEditor.amount);
    if (!isFinite(amt) || amt < 0) return setTargetEditor({ ...targetEditor, error: "Enter a valid number (0 or more)." });
    await update({ target: amt });
    setTargetEditor(null);
  };

  /* ---------------------------------------
     UI states (no early returns)
  ----------------------------------------*/
  const showSignInMsg = !uid;
  const showLoading = uid && !ready;

  return (
    <section className="budget-wrap">
      {/* Header: date + calendar + schedule */}
      <div className="headerline section">
        <div className="header-left">
          <strong className="budget-date">{period.start.toDateString()}</strong>
          <span className="budget-week">· {schedule === "weekly" ? `Week ${weekNo}` : schedule === "monthly" ? period.start.toLocaleString(undefined, { month: "long", year: "numeric" }) : schedule === "fortnight" ? `Fortnight (starts ${period.start.toDateString()})` : period.start.getFullYear()}</span>

          {/* Calendar button */}
          <button
            type="button"
            className="icon-pill"
            aria-label="Pick date"
            onClick={() => setShowCalendar((s) => !s)}
            title="Pick date"
          >
            {/* calendar svg */}
            <svg
              className="svg-24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 -960 960 960"
              aria-hidden="true"
            >
              <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400Z" fill="currentColor"/>
            </svg>
          </button>

          {showCalendar && (
            <div className="calendar-card">
              <input
                className="calendar-input"
                type="date"
                onChange={onPickDate}
                defaultValue={toInputDate(refDate)}
              />
            </div>
          )}
        </div>

        <div className="header-right">
          <label className="schedule-label" htmlFor="sched">Schedule</label>
          <select id="sched" className="schedule-select" value={schedule} onChange={onChangeSchedule}>
            <option value="weekly">Weekly (Mon–Sun)</option>
            <option value="fortnight">Fortnight</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {/* States */}
      {showSignInMsg && (
        <div className="card section">
          <p>Please sign in to use the budget.</p>
        </div>
      )}

      {showLoading && (
        <div className="card section">
          <p>Loading budget…</p>
        </div>
      )}

      {!showSignInMsg && !showLoading && (
        <>
          {/* CHARTS */}
          <div className="budget-toolbar section">
            <div className="segmented" role="tablist" aria-label="Chart type">
              <button
                className={`seg-btn ${chartMode === "bar" ? "active" : ""}`}
                onClick={() => setChartMode("bar")}
                role="tab"
                aria-selected={chartMode === "bar"}
                title="Bar chart"
              >
                {/* bar svg */}
                <svg className="svg-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                  <path d="M240-200v-360h120v360H240Zm180 0v-560h120v560H420Zm180 0v-200h120v200H600Z" fill="currentColor"/>
                </svg>
              </button>
              <button
                className={`seg-btn ${chartMode === "pie" ? "active" : ""}`}
                onClick={() => setChartMode("pie")}
                role="tab"
                aria-selected={chartMode === "pie"}
                title="Pie chart"
              >
                {/* pie svg */}
                <svg className="svg-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                  <path d="M520-520v-320q133 0 226.5 93.5T840-520H520Zm-80 80H120q0-133 93.5-226.5T440-840v320Zm80 320v-320h320q0 133-93.5 226.5T520-120Zm-80 0q-133 0-226.5-93.5T120-440h320v320Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="section">
            <div className="card chart-card">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === "bar" ? (
                    <RBarChart data={barData} barGap={8} barCategoryGap={40}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {/* income stacks */}
                      {incKeys.map((k, i) => (
                        <Bar
                          key={k}
                          dataKey={k}
                          stackId="income"
                          radius={[0, 0, 0, 0]}
                          fill={PALETTE[i % PALETTE.length]}
                          name={`Income · ${k.replace("$inc:", "")}`}
                        />
                      ))}
                      {/* expense stacks */}
                      {expKeys.map((k, i) => (
                        <Bar
                          key={k}
                          dataKey={k}
                          stackId="spend"
                          radius={[0, 0, 0, 0]}
                          fill={darken(PALETTE[i % PALETTE.length], 0.12)}
                          name={`Spend · ${k.replace("$exp:", "")}`}
                        />
                      ))}
                    </RBarChart>
                  ) : (
                    <RPieChart>
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Pie
                        data={Object.entries(spendByCategory).map(([name, value]) => ({ name, value }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                      >
                        {Object.keys(spendByCategory).map((c, i) => (
                          <Cell key={c} fill={darken(PALETTE[i % PALETTE.length], 0.12)} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </RPieChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="chart-summary">
                Income ${fmt(totalIncome)} · Spend ${fmt(totalSpend)} · Target ${fmt(target)} · Remaining ${fmt(remaining)}
                {over > 0 ? ` (Over ${fmt(over)})` : ""}
              </div>
            </div>
          </div>

          {/* ENTRY TILES (flex) */}
          <div className="section cards-flex">
            {/* INCOME (full width) */}
            <div className="entry-card full" role="region" aria-label="Income">
              <div className="entry-row">
                <div>
                  <div className="entry-title">Income</div>
                  <div className="entry-sub">This {schedule}: {Object.keys(incomeBySource).length} source(s)</div>
                </div>
                <div className="entry-value">${fmt(totalIncome)}</div>
              </div>

              {/* two-step inside tile */}
              {incomeEditor ? (
                <div className="inline-form" style={{ marginTop: 8 }}>
                  {incomeEditor.step === "source" && (
                    <>
                      <input
                        className="tile-input"
                        placeholder="Source (e.g., Salary)"
                        value={incomeEditor.source}
                        onChange={(e) => setIncomeEditor({ ...incomeEditor, source: e.target.value, error: "" })}
                      />
                      <button className="pill-link" onClick={saveIncomeSource}>Save</button>
                    </>
                  )}
                  {incomeEditor.step === "amount" && (
                    <>
                      <input
                        className="tile-input"
                        inputMode="decimal"
                        placeholder="Amount (e.g., 500)"
                        value={incomeEditor.amount}
                        onChange={(e) => setIncomeEditor({ ...incomeEditor, amount: onlyNumeric(e.target.value), error: "" })}
                      />
                      <button className="pill-link" onClick={saveIncomeAmount}>Save</button>
                    </>
                  )}
                  {incomeEditor.error && <div className="error-note">{incomeEditor.error}</div>}
                </div>
              ) : (
                <div className="entry-row" style={{ marginTop: 8 }}>
                  <button className="pill-link" onClick={startIncomeSource}>Add income</button>
                </div>
              )}

              {/* breakdown list (scrolls inside) */}
              <div className="tile-scroll">
                {Object.entries(incomeBySource).map(([s, v], i) => (
                  <div key={s} className="entry-row">
                    <span className="legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="legend-label">{s}</span>
                    <strong>${fmt(v)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* TARGET (fixed) */}
            <div className="entry-card fixed" role="region" aria-label="Target">
              <div className="entry-row">
                <div className="entry-title">Target</div>
                <div className="entry-value">${fmt(target)}</div>
              </div>

              {targetEditor ? (
                <div className="inline-form" style={{ marginTop: 8 }}>
                  <input
                    className="tile-input"
                    inputMode="decimal"
                    placeholder="Target (e.g., 1000)"
                    value={targetEditor.amount}
                    onChange={(e) => setTargetEditor({ ...targetEditor, amount: onlyNumeric(e.target.value), error: "" })}
                  />
                  <button className="pill-link" onClick={saveTarget}>Save</button>
                  {targetEditor.error && <div className="error-note">{targetEditor.error}</div>}
                </div>
              ) : (
                <div className="entry-row" style={{ marginTop: 8 }}>
                  <button className="pill-link" onClick={startTarget}>Set / Edit</button>
                </div>
              )}
            </div>

            {/* EXPENSES (fixed) */}
            <div className="entry-card fixed" role="region" aria-label="Expenses">
              <div className="entry-row">
                <div className="entry-title">Expenses</div>
                <div className="entry-value">${fmt(totalSpend)}</div>
              </div>

              {/* two-step inside tile */}
              {expenseEditor ? (
                <div className="inline-form" style={{ marginTop: 8 }}>
                  {expenseEditor.step === "category" && (
                    <>
                      <input
                        className="tile-input"
                        placeholder="Category (e.g., Groceries)"
                        value={expenseEditor.category}
                        onChange={(e) => setExpenseEditor({ ...expenseEditor, category: e.target.value, error: "" })}
                      />
                      <button className="pill-link" onClick={saveExpenseCategory}>Save</button>
                    </>
                  )}
                  {expenseEditor.step === "amount" && (
                    <>
                      <input
                        className="tile-input"
                        inputMode="decimal"
                        placeholder="Amount (e.g., 80)"
                        value={expenseEditor.amount}
                        onChange={(e) => setExpenseEditor({ ...expenseEditor, amount: onlyNumeric(e.target.value), error: "" })}
                      />
                      <button className="pill-link" onClick={saveExpenseAmount}>Save</button>
                    </>
                  )}
                  {expenseEditor.error && <div className="error-note">{expenseEditor.error}</div>}
                </div>
              ) : (
                <div className="entry-row" style={{ marginTop: 8 }}>
                  <button className="pill-link" onClick={startExpenseCategory}>Add expense</button>
                </div>
              )}

              {/* breakdown list (scrolls inside) */}
              <div className="tile-scroll">
                {Object.entries(spendByCategory).map(([c, v], i) => (
                  <div key={c} className="entry-row">
                    <span className="legend-dot" style={{ background: darken(PALETTE[i % PALETTE.length], 0.12) }} />
                    <span className="legend-label">{c}</span>
                    <strong>${fmt(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}