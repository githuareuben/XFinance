import { useMemo } from "react";
import BudgetCircle from "../components/PieChart";
import BudgetTable from "../components/BarChart";
import { useUserDoc } from "../library/useUserDoc";

export default function Savings({ user }) {
  const uid = user?.uid;
  const path = uid ? `users/${uid}/savings/model` : null;

  // New users: start with empty goals
  const { data, ready, update } = useUserDoc(path, { goals: [] });
  const goals = data?.goals || [];

  const donutItems = useMemo(
    () => goals.map(g => ({
      label: g.label || "",
      amount: Math.max(0, (Number(g.target) || 0) - (Number(g.saved) || 0)),
    })),
    [goals]
  );

  const totalRemaining = useMemo(
    () => donutItems.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [donutItems]
  );

  const setItems = async (next) => update({ goals: next });

  if (!uid) {
    return (
      <section className="budget-wrap">
        <p>Please sign in to save and sync your savings goals.</p>
      </section>
    );
  }
  if (!ready) {
    return (
      <section className="budget-wrap">
        <p>Loading savings…</p>
      </section>
    );
  }

  return (
    <section className="budget-wrap">
      <h2 style={{ margin: "0 0 12px" }}>Savings Goals</h2>
      <div className="budget-grid">
        <BudgetCircle items={donutItems} total={totalRemaining} cap={0} remaining={0} over={0} />
        <BudgetTable mode="savings" items={goals} onChange={setItems} />
      </div>
    </section>
  );
}