import { useMemo, useState } from "react";

/** Safe-ish arithmetic evaluator with relative ops (+10, -5, *1.1, /2) */
function evalExpression(input, base) {
  const s = String(input).trim();
  if (s === "") return NaN;

  // relative: +10, -10, *1.1, /2
  if (/^[+\-*/]\s*\d/.test(s)) {
    const op = s[0];
    const rhs = s.slice(1).trim();
    const rhsVal = evalExpression(rhs, 0);
    if (isNaN(rhsVal)) return NaN;
    const b = Number(base) || 0;
    switch (op) {
      case "+": return b + rhsVal;
      case "-": return b - rhsVal;
      case "*": return b * rhsVal;
      case "/": return rhsVal === 0 ? NaN : b / rhsVal;
      default: return NaN;
    }
  }

  if (!/^[0-9+\-*/().\s]+$/.test(s)) return NaN;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${s});`)();
    return typeof val === "number" && isFinite(val) ? val : NaN;
  } catch {
    return NaN;
  }
}

export default function BudgetTable({ mode, items, onChange, footer }) {
  const [drafts, setDrafts] = useState({}); // key = `${row}:${field}`

  const columns = useMemo(() => {
    if (mode === "budget") {
      return [
        { key: "label",  title: "Category", type: "text" },
        { key: "target", title: "Target ($)", type: "number" },
        { key: "used",   title: "Used ($)",   type: "number" },
      ];
    } else {
      return [
        { key: "label",  title: "Goal",       type: "text" },
        { key: "target", title: "Target ($)", type: "number" },
        { key: "saved",  title: "Saved ($)",  type: "number" },
      ];
    }
  }, [mode]);

  const commit = (rowIdx, field, raw) => {
    const key = `${rowIdx}:${field}`;
    const base = items[rowIdx]?.[field];
    let val;
    if (field === "label") {
      val = String(raw);
    } else {
      const num = evalExpression(raw, base);
      val = isNaN(num) ? base : Number(num);
    }

    const next = items.map((it, i) =>
      i === rowIdx ? { ...it, [field]: field === "label" ? val : Number(val) } : it
    );
    onChange(next);
    setDrafts(d => {
      const nx = { ...d };
      delete nx[key];
      return nx;
    });
  };

  const onChangeDraft = (rowIdx, field, value) => {
    setDrafts(d => ({ ...d, [`${rowIdx}:${field}`]: value }));
  };

  const addRow = () => {
    const newItem = mode === "budget"
      ? { label: "", target: 0, used: 0 }
      : { label: "", target: 0, saved: 0 };
    onChange([...items, newItem]);
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="table-card">
      <div className="table-head" style={{gridTemplateColumns:"1fr 140px 140px 40px"}}>
        {columns.map(c => <div key={c.key}>{c.title}</div>)}
        <div />
      </div>

      {items.map((it, i) => (
        <div key={i} className="table-row" style={{gridTemplateColumns:"1fr 140px 140px 40px"}}>
          {columns.map((c) => {
            const key = `${i}:${c.key}`;
            const isText = c.type === "text";
            const value = drafts[key] ?? (isText ? (it[c.key] ?? "") : (it[c.key] ?? 0));
            return isText ? (
              <input
                key={c.key}
                value={value}
                onChange={(e) => onChangeDraft(i, c.key, e.target.value)}
                onBlur={(e) => commit(i, c.key, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(i, c.key, e.currentTarget.value); }}
                aria-label={c.title}
              />
            ) : (
              <input
                key={c.key}
                value={value}
                onChange={(e) => onChangeDraft(i, c.key, e.target.value)}
                onBlur={(e) => commit(i, c.key, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(i, c.key, e.currentTarget.value); }}
                inputMode="decimal"
                aria-label={c.title}
                placeholder="0"
              />
            );
          })}

          <button className="link danger" onClick={() => remove(i)} aria-label="Delete row">✕</button>
        </div>
      ))}

      <div className="table-row add-row" style={{gridTemplateColumns:"1fr 140px 140px 40px"}}>
        <button className="link" onClick={addRow}>Add</button>
      </div>

      {footer}
    </div>
  );
}