// src/components/BudgetSetupWizard.jsx
import { useMemo, useState } from "react";
import "./../styles/BudgetQuestionnaire.css"; // separate styles

const REGULAR_TEMPLATES = [
  { key: "Groceries", emoji: "🛒" },
  { key: "Fuel", emoji: "⛽️" },
  { key: "Transport", emoji: "🚌" },
  { key: "Rent", emoji: "🏠" },
  { key: "Subscriptions", emoji: "📺" },
  { key: "Utilities", emoji: "💡" },
  { key: "Phone/Internet", emoji: "📱" },
];

const FREQS = ["weekly", "fortnight", "monthly", "yearly", "custom"];

export default function BudgetSetupWizard({
  onClose,                // called when user cancels/closes
  onComplete,             // (payload) => void; you persist + mark finished
  saving,                 // boolean: disable buttons while saving
}) {
  const [step, setStep] = useState(0);

  // Master payload that will be handed back to parent on finish
  const [answers, setAnswers] = useState({
    reasonPrimary: "",              // "save" | "budget" | "other"
    saveReason: "",                 // only if reasonPrimary === "save"
    targetDate: "",                 // ISO string from <input type="date">
    targetAmount: "",               // string; parent can numeric-parse
    expenses: [],                   // [{ key, freq, amount }]
    incomes: [],                    // [{ source, freq, amount }]
  });

  // internal transient UI states
  const [customExpense, setCustomExpense] = useState({ key: "", freq: "weekly", amount: "" });
  const [newIncome, setNewIncome] = useState({ source: "", freq: "weekly", amount: "" });

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!answers.reasonPrimary;
      case 1: // save reason (if they chose "save") or skip
        return true;
      case 2: // target date
        return true; // optional date (they can type later)
      case 3: // target amount (can be blank for "no savings")
        return true;
      case 4: // expenses — optional
        return true;
      case 5: // income — must have at least one?
        return answers.incomes.length > 0;
      default:
        return true;
    }
  }, [step, answers]);

  const showSaveFollowups = answers.reasonPrimary === "save";

  function toggleExpenseTemplate(key) {
    const exists = answers.expenses.some((e) => e.key === key);
    if (exists) {
      setAnswers((s) => ({ ...s, expenses: s.expenses.filter((e) => e.key !== key) }));
    } else {
      setAnswers((s) => ({
        ...s,
        expenses: [...s.expenses, { key, freq: "weekly", amount: "" }],
      }));
    }
  }

  function updateExpense(key, patch) {
    setAnswers((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    }));
  }

  function addCustomExpense() {
    const k = (customExpense.key || "").trim();
    if (!k) return;
    setAnswers((s) => ({
      ...s,
      expenses: [...s.expenses, { key: k, freq: customExpense.freq, amount: customExpense.amount }],
    }));
    setCustomExpense({ key: "", freq: "weekly", amount: "" });
  }

  function addIncome() {
    const src = (newIncome.source || "").trim();
    const amt = (newIncome.amount || "").trim();
    if (!src || !amt) return;
    setAnswers((s) => ({
      ...s,
      incomes: [...s.incomes, { ...newIncome }],
    }));
    setNewIncome({ source: "", freq: "weekly", amount: "" });
  }

  function removeIncome(idx) {
    setAnswers((s) => ({
      ...s,
      incomes: s.incomes.filter((_, i) => i !== idx),
    }));
  }

  const steps = [
    {
      title: "Why do you want to budget?",
      body: (
        <div className="wiz-options">
          {["save", "budget", "other"].map((opt) => (
            <button
              key={opt}
              className={`wiz-chip ${answers.reasonPrimary === opt ? "active" : ""}`}
              onClick={() => setAnswers((s) => ({ ...s, reasonPrimary: opt }))}
            >
              {opt === "save" ? "Save" : opt === "budget" ? "Budget" : "Other"}
            </button>
          ))}
        </div>
      ),
    },

    {
      title: "Why do you want to save?",
      body:
        showSaveFollowups ? (
          <textarea
            className="wiz-input"
            placeholder="e.g., emergency fund, new car, holiday…"
            value={answers.saveReason}
            onChange={(e) => setAnswers((s) => ({ ...s, saveReason: e.target.value }))}
          />
        ) : (
          <div className="wiz-note">We’ll skip this since you didn’t choose “Save”.</div>
        ),
    },

    {
      title: "When do you want to achieve your saving target?",
      body: (
        <div className="wiz-inline">
          <input
            className="wiz-input"
            type="date"
            value={answers.targetDate}
            onChange={(e) => setAnswers((s) => ({ ...s, targetDate: e.target.value }))}
          />
          <div className="wiz-help">Pick a month/year or leave blank for later.</div>
        </div>
      ),
    },

    {
      title: "How much do you intend to save?",
      body: (
        <>
          <input
            className="wiz-input"
            inputMode="decimal"
            placeholder="Amount (AUD) — leave empty for 'no savings'"
            value={answers.targetAmount}
            onChange={(e) => setAnswers((s) => ({ ...s, targetAmount: e.target.value }))}
          />
          <div className="wiz-help">You can adjust this anytime.</div>
        </>
      ),
    },

    {
      title: "Tell us about your expenses",
      body: (
        <>
          <div className="wiz-tiles">
            {REGULAR_TEMPLATES.map((t) => {
              const active = answers.expenses.some((e) => e.key === t.key);
              return (
                <button
                  key={t.key}
                  className={`wiz-tile ${active ? "active" : ""}`}
                  onClick={() => toggleExpenseTemplate(t.key)}
                >
                  <span className="wiz-emoji">{t.emoji}</span>
                  <span>{t.key}</span>
                </button>
              );
            })}
            {/* Custom tile */}
            <div className="wiz-tile custom">
              <input
                className="wiz-input"
                placeholder="Add expense…"
                value={customExpense.key}
                onChange={(e) => setCustomExpense((s) => ({ ...s, key: e.target.value }))}
              />
              <div className="wiz-inline">
                <select
                  className="wiz-select"
                  value={customExpense.freq}
                  onChange={(e) => setCustomExpense((s) => ({ ...s, freq: e.target.value }))}
                >
                  {FREQS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input
                  className="wiz-input"
                  inputMode="decimal"
                  placeholder="Amount"
                  value={customExpense.amount}
                  onChange={(e) => setCustomExpense((s) => ({ ...s, amount: e.target.value }))}
                />
                <button className="wiz-chip" onClick={addCustomExpense}>Add</button>
              </div>
            </div>
          </div>

          {/* For each selected expense, let them set freq + amount */}
          {!!answers.expenses.length && (
            <div className="wiz-list">
              {answers.expenses.map((e) => (
                <div key={e.key} className="wiz-row">
                  <div className="wiz-row-name">{e.key}</div>
                  <select
                    className="wiz-select"
                    value={e.freq}
                    onChange={(ev) => updateExpense(e.key, { freq: ev.target.value })}
                  >
                    {FREQS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    className="wiz-input"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={e.amount}
                    onChange={(ev) => updateExpense(e.key, { amount: ev.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      ),
    },

    {
      title: "Enter your source(s) of income",
      body: (
        <>
          {/* Add new income */}
          <div className="wiz-inline">
            <input
              className="wiz-input"
              placeholder="Source (e.g., Salary, Uber)"
              value={newIncome.source}
              onChange={(e) => setNewIncome((s) => ({ ...s, source: e.target.value }))}
            />
            <select
              className="wiz-select"
              value={newIncome.freq}
              onChange={(e) => setNewIncome((s) => ({ ...s, freq: e.target.value }))}
            >
              {FREQS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              className="wiz-input"
              inputMode="decimal"
              placeholder="Amount"
              value={newIncome.amount}
              onChange={(e) => setNewIncome((s) => ({ ...s, amount: e.target.value }))}
            />
            <button className="wiz-chip" onClick={addIncome}>Add</button>
          </div>

          {/* List incomes */}
          {!!answers.incomes.length && (
            <div className="wiz-list">
              {answers.incomes.map((inc, i) => (
                <div key={`${inc.source}-${i}`} className="wiz-row">
                  <div className="wiz-row-name">{inc.source}</div>
                  <div className="wiz-row-meta">{inc.freq} · {inc.amount}</div>
                  <button className="wiz-chip danger" onClick={() => removeIncome(i)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="wiz-help">Add at least one source to continue.</div>
        </>
      ),
    },
  ];

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }
  function finish() {
    onComplete?.(answers);
  }

  const last = step === steps.length - 1;

  return (
    <div className="wiz-backdrop" role="dialog" aria-modal="true">
      <div className="wiz-card">
        <div className="wiz-title">{steps[step].title}</div>
        <div className="wiz-body">{steps[step].body}</div>

        <div className="wiz-actions">
          <button className="wiz-link" onClick={onClose}>Skip</button>
          <div className="wiz-spacer" />
          {step > 0 && (
            <button className="wiz-btn ghost" onClick={back}>Back</button>
          )}
          {!last ? (
            <button className="wiz-btn" onClick={next} disabled={!canNext}>Next</button>
          ) : (
            <button className="wiz-btn" onClick={finish} disabled={saving || answers.incomes.length === 0}>
              {saving ? "Saving…" : "Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}