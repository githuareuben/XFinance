import { useMemo } from "react";
import BudgetCircle from "../components/BudgetCircle";
import BudgetTable from "../components/BudgetTable";
import { useUserDoc } from "../library/useUserDoc";

// target & used per category
const defaultData = {
  period: "Monthly",
  monthly: [
    { label: "Storage",     target: 98,   used: 87 },
    { label: "Insurance",   target: 34,   used: 34 },
    { label: "Gym",         target: 76,   used: 76 },
    { label: "ChatGPT",     target: 40,   used: 40 },
    { label: "Spotify",     target: 8,    used: 8  },
    { label: "reMarkable",  target: 4.99, used: 4.99 },
    { label: "Apple",       target: 4.99, used: 4.99 },
    { label: "Telsim",      target: 35,   used: 35 },
    { label: "Cleaning",    target: 40,   used: 40 },
    { label: "Supplements", target: 70,   used: 70 },
    { label: "Grooming",    target: 30,   used: 30 },
  ],
  weekly: [
    { label: "Groceries: Protein powder", target: 22, used: 22 },
    { label: "Groceries: Org Vegetables", target: 12, used: 12 },
    { label: "Milk",                      target: 5,  used: 5  },
    { label: "Coles LSA 350g",           target: 5,  used: 5  },
    { label: "Almond meal 665g",         target: 12, used: 12 },
    { label: "Peanut butter",            target: 5,  used: 5  },
    { label: "Hemp seeds",               target: 9,  used: 9  },
    { label: "Miscellaneous",            target: 20, used: 20 },
    { label: "Fuel",                     target: 80, used: 80 },
  ]
};

export default function Budget({ user }) {
  const uid = user?.uid;
  const path = uid ? `users/${uid}/budget/model` : null;

  const { data, ready, update } = useUserDoc(path, defaultData);
  const model = data || defaultData;

  const period = model.period;
  const items = period === "Monthly" ? model.monthly : model.weekly;

  const usedTotal = useMemo(() => items.reduce((s, i) => s + (+i.used || 0), 0), [items]);
  const targetTotal = useMemo(() => items.reduce((s, i) => s + (+i.target || 0), 0), [items]);
  const remaining = Math.max(0, targetTotal - usedTotal);
  const over = Math.max(0, usedTotal - targetTotal);

  const setItems = async (next) => {
    const key = period.toLowerCase();
    await update({ [key]: next });
  };

  if (!uid) return <section className="budget-wrap"><p>Please sign in to save and sync your budget.</p></section>;
  if (!ready) return <section className="budget-wrap"><p>Loading budget…</p></section>;

  return (
    <section className="budget-wrap">
      <div className="budget-toolbar">
        <div className="segmented">
          {["Monthly", "Weekly"].map((p) => (
            <button
              key={p}
              className={`seg-btn ${period === p ? "active" : ""}`}
              onClick={() => update({ period: p })}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="budget-grid">
        <BudgetCircle
          items={items.map(it => ({ label: it.label, amount: +it.used || 0 }))}
          total={usedTotal}
          cap={targetTotal}
          remaining={remaining}
          over={over}
        />

        <BudgetTable
          mode="budget"                 // calc-aware inputs for target & used
          items={items}
          onChange={setItems}
          footer={
            <div className="totals">
              <div><strong>Target</strong> ${targetTotal.toFixed(2)}</div>
              <div><strong>Used</strong> ${usedTotal.toFixed(2)}</div>
              {over > 0
                ? <div className="over"><strong>Over</strong> ${over.toFixed(2)}</div>
                : <div className="remaining"><strong>Remaining</strong> ${remaining.toFixed(2)}</div>
              }
            </div>
          }
        />
      </div>
    </section>
  );
}