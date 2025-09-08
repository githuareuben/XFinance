// src/pages/Budget.jsx
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

import BudgetSetupWizard from "../components/BudgetQuestionnaire";

/* -----------------------------
   Default Firestore model
------------------------------*/
const DEFAULT_MODEL = {
  schedule: "weekly", // weekly | fortnight | monthly | yearly
  incomes: [],        // [{id, source, amount, ts, payDay?, payDate?, lastRefresh?}]
  expenses: [],       // [{id, category, amount, ts}]
  target: 0,
  settings: {
    autoRefresh: true,
    defaultPayDay: 5, // Friday (0=Sunday, 1=Monday, etc.)
    defaultPayDate: 1, // 1st of month
  }
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

// Auto-refresh logic
function shouldRefreshIncome(income, schedule, settings) {
  if (!settings?.autoRefresh) return false;
  if (!income.lastRefresh) return false; // First time, don't auto-refresh

  const now = new Date();
  const lastRefresh = new Date(income.lastRefresh);

  switch (schedule) {
    case "weekly": {
      const payDay = income.payDay ?? settings.defaultPayDay;
      const daysSinceLastRefresh = Math.floor((now - lastRefresh) / (1000 * 60 * 60 * 24));
      return daysSinceLastRefresh >= 7 && now.getDay() === payDay;
    }
    case "fortnight": {
      const daysSince = Math.floor((now - lastRefresh) / (1000 * 60 * 60 * 24));
      return daysSince >= 14;
    }
    case "monthly": {
      const payDate = income.payDate ?? settings.defaultPayDate;
      return now.getDate() === payDate && now.getMonth() !== lastRefresh.getMonth();
    }
    case "yearly":
      return now.getFullYear() !== lastRefresh.getFullYear();
    default:
      return false;
  }
}

function getDayName(dayIndex) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] || "Invalid";
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
      default: break;
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
  const [showSettings, setShowSettings] = useState(false);
  // only show the "Add income" CTA after the tile is pressed
const [incomeTileOpen, setIncomeTileOpen] = useState(false);

  // NEW: Summary export UI state
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryMode, setSummaryMode] = useState("this-period"); // 'this-period' | 'this-month' | 'custom'
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()));
  const [customTo, setCustomTo] = useState(toInputDate(new Date()));

  // two-step editors that live INSIDE tiles
  // income editor: step = "source" | "amount" | "schedule"
  const [incomeEditor, setIncomeEditor] = useState(null);
  // expense editor: step = "category" | "amount"
  const [expenseEditor, setExpenseEditor] = useState(null);
  // target editor
  const [targetEditor, setTargetEditor] = useState(null);

  /* === Onboarding (wizard) doc === */
  const setupPath = user ? `users/${user.uid}/profile/setup` : null;
  const {
    data: setup = { hasDoneTour: false, hasDoneBudgetSetup: false },
    ready: setupReady,
    update: updateSetup,
  } = useUserDoc(setupPath, { hasDoneTour: false, hasDoneBudgetSetup: false });

  const [showWizard, setShowWizard] = useState(false);
  const [savingWizard, setSavingWizard] = useState(false);

  useEffect(() => {
    if (user && setupReady && !setup.hasDoneBudgetSetup) {
      setShowWizard(true);
    }
  }, [user, setupReady, setup?.hasDoneBudgetSetup]);

  async function handleWizardComplete(payload) {
    // payload = { reasonPrimary, saveReason, targetDate, targetAmount, expenses[], incomes[] }
    const targetNum = Number(payload.targetAmount || 0) || 0;
    const now = Date.now();

    const newExpenses = (payload.expenses || [])
      .filter((e) => e.key)
      .map((e) => ({
        id: `${now}-${e.key}`,
        category: e.key,
        amount: Number(e.amount || 0) || 0,
        ts: now,
        freq: e.freq,
      }));

    const newIncomes = (payload.incomes || [])
      .filter((i) => i.source)
      .map((i) => ({
        id: `${now}-${i.source}`,
        source: i.source,
        amount: Number(i.amount || 0) || 0,
        ts: now,
        freq: i.freq,
        lastRefresh: now,
      }));

    try {
      setSavingWizard(true);
      await update({
        target: targetNum > 0 ? targetNum : (typeof data?.target === "number" ? data.target : 0),
        expenses: [...(data?.expenses || []), ...newExpenses],
        incomes: [...(data?.incomes || []), ...newIncomes],
        onboarding: {
          reasonPrimary: payload.reasonPrimary,
          saveReason: payload.saveReason || "",
          targetDate: payload.targetDate || "",
          createdAt: now,
        },
      });
      await updateSetup({ hasDoneBudgetSetup: true, updatedAt: now });
      setShowWizard(false);
    } finally {
      setSavingWizard(false);
    }
  }

  // Ensure the model has schedule and settings after load
  useEffect(() => {
    if (ready && data) {
      const updates = {};
      if (!data.schedule) updates.schedule = "weekly";
      if (!data.settings) updates.settings = DEFAULT_MODEL.settings;
      if (Object.keys(updates).length > 0) {
        update(updates);
      }
    }
  }, [ready, data, update]);

  // Auto-refresh incomes on load and periodically
  useEffect(() => {
    if (!ready || !data || !data.incomes?.length) return;

    const settings = data.settings || DEFAULT_MODEL.settings;
    const schedule = data.schedule || "weekly";

    let hasRefreshes = false;
    const updatedIncomes = data.incomes.map((income) => {
      if (shouldRefreshIncome(income, schedule, settings)) {
        hasRefreshes = true;
        return {
          ...income,
          amount: 0,
          lastRefresh: Date.now(),
        };
      }
      return income;
    });

    if (hasRefreshes) {
      update({ incomes: updatedIncomes });
    }
  }, [ready, data, update]);

  // Safe fallbacks if not ready
  const schedule = (data?.schedule || "weekly").toLowerCase();
  const settings = data?.settings || DEFAULT_MODEL.settings;
  const period = getPeriod(schedule, refDate);

  // FIX: always compute week number from the CURRENT refDate so it never “sticks”
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
  // (kept for internal logic; UI selector removed)
  const onChangeSchedule = async (e) => {
    await update({ schedule: e.target.value });
  };

  // Ensure only one "tab" open at a time
  const toggleCalendar = () => {
    setShowCalendar((prev) => {
      const next = !prev;
      if (next) {
        setShowSummaryDialog(false);
        setShowSettings(false);
      }
      return next;
    });
  };
  const toggleSummary = () => {
    setShowSummaryDialog((prev) => {
      const next = !prev; // clicking Summary closes it if open
      if (next) {
        setShowCalendar(false);
        setShowSettings(false);
      }
      return next;
    });
  };
  const toggleSettings = () => {
    setShowSettings((prev) => {
      const next = !prev;
      if (next) {
        setShowCalendar(false);
        setShowSummaryDialog(false);
      }
      return next;
    });
  };

  // Mini-calendar month helpers
  const [calMonth, setCalMonth] = useState(() => new Date(refDate.getFullYear(), refDate.getMonth(), 1));
  useEffect(() => {
    // keep calendar month in sync when refDate changes
    setCalMonth(new Date(refDate.getFullYear(), refDate.getMonth(), 1));
  }, [refDate]);

  const prevMonth = () => {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  // Which days to highlight as income days
  const incomeDaySet = useMemo(() => {
    const set = new Set();
    const monthEnd = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();

    // Collect weekly/fortnight weekday highlights
    const payDays = new Set();
    incomes.forEach((inc) => {
      if (schedule === "weekly" || schedule === "fortnight") {
        const d = typeof inc.payDay === "number" ? inc.payDay : settings.defaultPayDay;
        payDays.add(d);
      }
    });

    // Collect monthly pay date highlights
    const payDates = new Set();
    incomes.forEach((inc) => {
      if (schedule === "monthly") {
        const d = typeof inc.payDate === "number" ? inc.payDate : settings.defaultPayDate;
        if (d >= 1 && d <= 31) payDates.add(d);
      }
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
      if (schedule === "monthly") {
        if (payDates.has(day)) set.add(day);
      } else {
        if (payDays.has(d.getDay())) set.add(day);
      }
    }
    return set;
  }, [incomes, settings.defaultPayDay, settings.defaultPayDate, schedule, calMonth]);

  const onPickDate = (pickedDate) => {
    if (!pickedDate) return;
    setRefDate(pickedDate);
    setShowCalendar(false);
  };

  // Settings handlers
  const updateSettings = async (newSettings) => {
    await update({ settings: { ...settings, ...newSettings } });
  };

  // Start 3-step editors
  const startIncomeSource = () =>
    setIncomeEditor({
      step: "source",
      source: "",
      amount: "",
      payDay: settings.defaultPayDay,
      payDate: settings.defaultPayDate,
    });
  const startExpenseCategory = () =>
    setExpenseEditor({ step: "category", category: "", amount: "" });
  const startTarget = () => setTargetEditor({ amount: String(target || "") });

  // Validate & advance income steps
  const saveIncomeSource = () => {
    if (!incomeEditor) return;
    const src = (incomeEditor.source || "").trim();
    if (!src) return setIncomeEditor({ ...incomeEditor, error: "Please enter a source of income." });
    setIncomeEditor({ ...incomeEditor, step: "amount", error: "" });
  };

  const saveIncomeAmount = () => {
    if (!incomeEditor) return;
    const amt = toMoney(incomeEditor.amount);
    if (!isFinite(amt) || amt <= 0) {
      return setIncomeEditor({ ...incomeEditor, error: "Please enter a valid amount greater than 0." });
    }
    setIncomeEditor({ ...incomeEditor, step: "schedule", error: "" });
  };

  const saveIncomeSchedule = async () => {
    if (!incomeEditor) return;
    const now = Date.now();
    const newIncome = {
      id: `${now}`,
      source: incomeEditor.source,
      amount: toMoney(incomeEditor.amount),
      ts: now,
      lastRefresh: now,
    };

    if (schedule === "weekly" || schedule === "fortnight") {
      newIncome.payDay = incomeEditor.payDay;
    } else if (schedule === "monthly") {
      newIncome.payDate = incomeEditor.payDate;
    }

    await update({
      incomes: [...(data?.incomes || []), newIncome],
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

  // Adjust / delete individual entries
  const adjustIncomeEntry = async (entry) => {
    const val = prompt(
      `Adjust "${entry.source}" (current $${fmt(entry.amount)}).\n` +
      'Enter +amount to add, -amount to subtract, or type DELETE to remove:'
    );
    if (val == null) return;
    if (val.trim().toUpperCase() === "DELETE") {
      const newArr = (data?.incomes || []).filter((e) => e.id !== entry.id);
      await update({ incomes: newArr });
      return;
    }
    const delta = Number(val);
    if (!isFinite(delta)) return alert("Enter a number like 40 or -40, or DELETE.");
    const newArr = (data?.incomes || []).map((e) =>
      e.id === entry.id ? { ...e, amount: Math.max(0, toMoney((e.amount || 0) + delta)) } : e
    );
    await update({ incomes: newArr });
  };

  const adjustExpenseEntry = async (entry) => {
    const val = prompt(
      `Adjust "${entry.category}" (current $${fmt(entry.amount)}).\n` +
      'Enter +amount to add, -amount to subtract, or type DELETE to remove:'
    );
    if (val == null) return;
    if (val.trim().toUpperCase() === "DELETE") {
      const newArr = (data?.expenses || []).filter((e) => e.id !== entry.id);
      await update({ expenses: newArr });
      return;
    }
    const delta = Number(val);
    if (!isFinite(delta)) return alert("Enter a number like 40 or -40, or DELETE.");
    const newArr = (data?.expenses || []).map((e) =>
      e.id === entry.id ? { ...e, amount: Math.max(0, toMoney((e.amount || 0) + delta)) } : e
    );
    await update({ expenses: newArr });
  };

  // Add amount to existing expense category (kept for convenience)
  const addToExpenseCategory = async (category) => {
    const amount = prompt(`Add amount to ${category}:`);
    if (!amount) return;

    const amt = toMoney(amount);
    if (!isFinite(amt) || amt <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    const now = Date.now();
    await update({
      expenses: [...(data?.expenses || []), { id: `${now}`, category, amount: amt, ts: now }],
    });
  };

  // ===== Summary export (robust: window + iframe fallback) =====
  function getSummaryRange() {
    if (summaryMode === "this-period") return period;
    if (summaryMode === "this-month") {
      const d0 = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      const d1 = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      return { start: d0, end: d1 };
    }
    // custom
    const [fy, fm, fd] = customFrom.split("-").map((n) => parseInt(n, 10));
    const [ty, tm, td] = customTo.split("-").map((n) => parseInt(n, 10));
    const d0 = new Date(fy, fm - 1, fd || 1);
    const d1 = new Date(ty, tm - 1, td || 1);
    return { start: d0, end: d1 };
  }

  const exportSummaryPDF = () => {
    const rng = getSummaryRange();
    // Filter data to range
    const inRange = (ts) => {
      const d = new Date(ts);
      return d >= rng.start && d <= rng.end;
    };
    const inc = incomes.filter((e) => inRange(e.ts));
    const exp = expenses.filter((e) => inRange(e.ts));
    const incSum = sumAmounts(inc);
    const expSum = sumAmounts(exp);
    const incBy = sumByKey(inc, "source");
    const expBy = sumByKey(exp, "category");

    // Try to grab the chart markup from the page (SVG will print fine)
    const chartHtml = document.querySelector(".chart-card")?.outerHTML || "";

    const html = `
      <html>
        <head>
          <title>Finance Summary</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif; padding: 24px; color: #111; }
            h1,h2 { margin: 0 0 8px 0; }
            .muted { color: #6b7280; }
            .row { display: flex; gap: 24px; flex-wrap: wrap; }
            .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; flex: 1 1 320px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { text-align: left; border-bottom: 1px solid #f1f5f9; padding: 6px 4px; }
            .total { font-weight: 800; }
            .chart-wrap { margin-top: 12px; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <h1>Finance Summary</h1>
          <div class="muted">${rng.start.toDateString()} → ${rng.end.toDateString()}</div>

          <div class="row" style="margin-top:16px;">
            <div class="card">
              <h2>Totals</h2>
              <div>Income: <strong>$${fmt(incSum)}</strong></div>
              <div>Expenses: <strong>$${fmt(expSum)}</strong></div>
              <div>Net: <strong>$${fmt(incSum - expSum)}</strong></div>
            </div>

            <div class="card">
              <h2>Income by Source</h2>
              <table>
                <thead><tr><th>Source</th><th>Amount</th></tr></thead>
                <tbody>
                  ${Object.entries(incBy).map(([k,v]) => `<tr><td>${k}</td><td>$${fmt(v)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>

            <div class="card">
              <h2>Expenses by Category</h2>
              <table>
                <thead><tr><th>Category</th><th>Amount</th></tr></thead>
                <tbody>
                  ${Object.entries(expBy).map(([k,v]) => `<tr><td>${k}</td><td>$${fmt(v)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card chart-wrap">
            <h2>Charts</h2>
            ${chartHtml}
          </div>

          <div style="margin-top:16px;">
            <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
          </div>
        </body>
      </html>
    `;

    // Preferred: open same-origin about:blank so printing works cleanly
    let w = null;
    try {
      w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        try { w.focus(); } catch {}
        return;
      }
    } catch {}

    // Fallback: hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("sandbox", "allow-modals allow-same-origin allow-scripts allow-top-navigation-by-user-activation");
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    }, 200);
  };

  /* ---------------------------------------
     UI states (no early returns)
  ----------------------------------------*/
  const showSignInMsg = !uid;
  const showLoading = uid && !ready;

  // Build cells for the mini calendar
  const calCells = useMemo(() => {
    const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const end = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const startDow = start.getDay(); // 0=Sun..6=Sat
    const days = end.getDate();

    const cells = [];

    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < startDow; i++) {
      cells.push({ label: "", muted: true });
    }
    for (let day = 1; day <= days; day++) {
      cells.push({ label: String(day), day, highlight: incomeDaySet.has(day) });
    }
    return { dows, cells };
  }, [calMonth, incomeDaySet]);

  return (
    <section className="budget-wrap">
      {/* Header: date + calendar + (Summary) + settings */}
      <div className="headerline section" style={{ position: "relative" }}>
        <div className="header-left" style={{ position: "relative" }}>
          <strong className="budget-date">{period.start.toDateString()}</strong>
          <span className="budget-week">
            · {schedule === "weekly"
              ? `Week ${weekNo}`
              : schedule === "monthly"
              ? period.start.toLocaleString(undefined, { month: "long", year: "numeric" })
              : schedule === "fortnight"
              ? `Fortnight (starts ${period.start.toDateString()})`
              : period.start.getFullYear()}
          </span>

          {/* Calendar button */}
          <button
            type="button"
            className="icon-pill"
            aria-label="Pick date"
            onClick={toggleCalendar}
            title="Pick date"
          >
            {/* calendar svg */}
            <svg
              className="svg-24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 -960 960 960"
              aria-hidden="true"
            >
              <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440Z" fill="currentColor"/>
            </svg>
          </button>

          {/* Calendar overlay: force below-date row (full width inside header-left) */}
          {showCalendar && (
            <div className="calendar-card" style={{ flexBasis: "100%", marginTop: 8, zIndex: 1 }}>
              <div className="card" style={{ padding: 12 }}>
                <div className="cal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <button className="pill-link" onClick={prevMonth}>‹ Prev</button>
                  <div style={{ fontWeight: 800 }}>
                    {calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </div>
                  <button className="pill-link" onClick={nextMonth}>Next ›</button>
                </div>

                {/* DOW header */}
                <div className="cal-grid" style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {calCells.dows.map((d) => (
                    <div key={d} className="cal-dow" style={{ textAlign: "center", opacity: 0.7, fontWeight: 700 }}>{d}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 6 }}>
                  {calCells.cells.map((c, i) => {
                    const className = [
                      "cal-cell",
                      c.muted ? "cal-muted" : "",
                      c.highlight ? "cal-highlight" : ""
                    ].join(" ").trim();
                    return (
                      <div
                        key={i}
                        className={className}
                        onClick={() => {
                          if (!c.day) return;
                          onPickDate(new Date(calMonth.getFullYear(), calMonth.getMonth(), c.day));
                        }}
                        role="button"
                        title={c.day ? new Date(calMonth.getFullYear(), calMonth.getMonth(), c.day).toDateString() : ""}
                        style={{
                          textAlign: "center",
                          padding: "6px 0",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.08)",
                          background: c.highlight ? "rgba(138, 43, 226, 0.12)" : "#fff",
                          cursor: c.day ? "pointer" : "default",
                          opacity: c.muted ? 0.4 : 1
                        }}
                      >
                        {c.label}
                      </div>
                    );
                  })}
                </div>

                <div className="cal-legend" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span><span className="dot weekly" style={{ display: "inline-block", width: 10, height: 10, background: "rgba(138,43,226,0.7)", borderRadius: 999, marginRight: 6 }}></span>Income day highlight</span>
                  <button className="pill-link" onClick={() => setShowCalendar(false)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="header-right">
          {/* Summary toggles open/close; closes other tabs */}
          <button
            type="button"
            className="icon-pill"
            aria-label="Summary"
            onClick={toggleSummary}
            title="Export summary PDF"
          >
            {/* summary/chart svg */}
            <svg className="svg-24" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M3 3h18v2H3V3Zm0 4h10v2H3V7Zm0 4h14v2H3v-2Zm0 4h8v2H3v-2Zm14 0h4v2h-4v-2Zm-2.5-9.5 2.25 2.25L22 5.5 20.59 4.09l-3.84 3.84-1.16-1.17L14.5 9.5Z"/>
            </svg>
            <span style={{ marginLeft: 6, fontWeight: 700 }}>Summary</span>
          </button>

          {/* Settings button (now toggles; closes others) */}
          <button
            type="button"
            className="icon-pill"
            aria-label="Settings"
            onClick={toggleSettings}
            title="Settings"
          >
            {/* settings svg */}
            <svg
              className="svg-24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 -960 960 960"
              aria-hidden="true"
            >
              <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 41q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 65q-5 14-7 29.5t-2 31.5q0 16 2 31.5t7 29.5l-86 65 39 68 99-41q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Summary dialog */}
      {showSummaryDialog && (
        <div className="section" style={{ zIndex: 1, position: "relative" }}>
          <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
            <h3 className="settings-title">Export Summary (PDF)</h3>
            <div className="settings-row">
              <label className="settings-label">
                <input
                  type="radio"
                  name="sumrng"
                  checked={summaryMode === "this-period"}
                  onChange={() => setSummaryMode("this-period")}
                />
                This period ({period.start.toDateString()} → {period.end.toDateString()})
              </label>
            </div>
            <div className="settings-row">
              <label className="settings-label">
                <input
                  type="radio"
                  name="sumrng"
                  checked={summaryMode === "this-month"}
                  onChange={() => setSummaryMode("this-month")}
                />
                This month ({new Date(refDate.getFullYear(), refDate.getMonth(), 1).toDateString()} → {new Date(refDate.getFullYear(), refDate.getMonth()+1, 0).toDateString()})
              </label>
            </div>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <label className="settings-label" style={{ gap: 12 }}>
                <input
                  type="radio"
                  name="sumrng"
                  checked={summaryMode === "custom"}
                  onChange={() => setSummaryMode("custom")}
                />
                Custom range
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="date"
                  className="calendar-input"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  disabled={summaryMode !== "custom"}
                />
                <span style={{ lineHeight: "34px" }}>→</span>
                <input
                  type="date"
                  className="calendar-input"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  disabled={summaryMode !== "custom"}
                />
              </div>
            </div>

            <div className="settings-row" style={{ justifyContent: "flex-end" }}>
              <button className="pill-link" onClick={toggleSummary}>Close</button>
              <button className="pill-link" onClick={exportSummaryPDF}>Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="section" style={{ zIndex: 1, position: "relative" }}>
          <div className="card settings-card">
            <h3 className="settings-title">Settings</h3>

            <div className="settings-row">
              <label className="settings-label">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => updateSettings({ autoRefresh: e.target.checked })}
                />
                Enable automatic income refresh
              </label>
            </div>

            <div className="settings-row">
              <label className="settings-label">Default pay day (weekly/fortnight):</label>
              <select
                value={settings.defaultPayDay}
                onChange={(e) => updateSettings({ defaultPayDay: parseInt(e.target.value) })}
                className="settings-select"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            <div className="settings-row">
              <label className="settings-label">Default pay date (monthly):</label>
              <select
                value={settings.defaultPayDate}
                onChange={(e) => updateSettings({ defaultPayDate: parseInt(e.target.value) })}
                className="settings-select"
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>

            <button
              className="pill-link"
              onClick={toggleSettings}
            >
              Close Settings
            </button>
          </div>
        </div>
      )}

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
                  <div className="entry-sub">This {schedule}: {incomesCurrent.length} entr{incomesCurrent.length === 1 ? "y" : "ies"}</div>
                </div>
                <div className="entry-value">${fmt(totalIncome)}</div>
              </div>

              {/* three-step inside tile */}
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
                      <button className="pill-link" onClick={saveIncomeSource}>Next</button>
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
                      <button className="pill-link" onClick={saveIncomeAmount}>Next</button>
                    </>
                  )}
                  {incomeEditor.step === "schedule" && (
                    <>
                      {(schedule === "weekly" || schedule === "fortnight") && (
                        <select
                          className="tile-select"
                          value={incomeEditor.payDay}
                          onChange={(e) => setIncomeEditor({ ...incomeEditor, payDay: parseInt(e.target.value) })}
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                      )}
                      {schedule === "monthly" && (
                        <select
                          className="tile-select"
                          value={incomeEditor.payDate}
                          onChange={(e) => setIncomeEditor({ ...incomeEditor, payDate: parseInt(e.target.value) })}
                        >
                          {Array.from({ length: 31 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                          ))}
                        </select>
                      )}
                      <button className="pill-link" onClick={saveIncomeSchedule}>Save</button>
                    </>
                  )}
                  {incomeEditor.error && <div className="error-note">{incomeEditor.error}</div>}
                </div>
              ) : (
                <div className="entry-row" style={{ marginTop: 8 }}>
                  <button className="pill-link" onClick={startIncomeSource}>Add income</button>
                </div>
              )}

              {/* individual income entries as tiles */}
              <div className="tile-scroll" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {incomesCurrent.map((e, i) => (
                  <div
                    key={e.id}
                    onClick={() => adjustIncomeEntry(e)}
                    className="entry-row"
                    title='Click to +add / -subtract, or type "DELETE" to remove'
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "#fff",
                      cursor: "pointer",
                      alignItems: "flex-start"
                    }}
                  >
                    <div className="income-item-details">
                      <span className="legend-dot" style={{ background: PALETTE[i % PALETTE.length], marginTop: 4 }} />
                      <div className="income-item-info">
                        <span className="legend-label" style={{ fontWeight: 700 }}>{e.source || "Income"}</span>
                        <div className="schedule-info">
                          {(schedule === "weekly" || schedule === "fortnight")
                            ? `Pays: ${getDayName(e.payDay ?? settings.defaultPayDay)}`
                            : schedule === "monthly"
                            ? `Pays: ${(e.payDate ?? settings.defaultPayDate)}${getOrdinalSuffix(e.payDate ?? settings.defaultPayDate)}`
                            : new Date(e.ts).toDateString()}
                        </div>
                      </div>
                    </div>
                    <strong>${fmt(e.amount)}</strong>
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
                      <button className="pill-link" onClick={saveExpenseCategory}>Next</button>
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

              {/* individual expense entries as tiles */}
              <div className="tile-scroll" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {expensesCurrent.map((e, i) => (
                  <div
                    key={e.id}
                    onClick={() => adjustExpenseEntry(e)}
                    className="entry-row"
                    title='Click to +add / -subtract, or type "DELETE" to remove'
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span className="legend-dot" style={{ background: darken(PALETTE[i % PALETTE.length], 0.12) }} />
                      <span className="legend-label" style={{ fontWeight: 700 }}>{e.category || "Expense"}</span>
                    </div>
                    <strong>${fmt(e.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Wizard overlay */}
      {user && setupReady && showWizard && (
        <BudgetSetupWizard
          saving={savingWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </section>
  );
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(num) {
  const j = num % 10,
    k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}