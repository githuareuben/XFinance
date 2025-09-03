import { useMemo } from "react";
import BudgetCircle from "./components/BudgetCircle";
import BudgetTable from "./components/BudgetTable";
import { useUserDoc } from "./library/useUserDoc";

const defaultGoals = [
  { label: "Emergency Fund", target: 1000, saved: 120 },
  { label: "New Laptop",     target: 1500, saved: 300 },
];

export default function Savings({ user }) {
  const uid = user?.uid;
  const path = uid ? `users/${uid}/savings/model` : null;

  const { data, ready, update } = useUserDoc(path, { goals: defaultGoals });
  const goals = data?.goals || defaultGoals;

  const donutItems = useMemo(
    () => goals.map(g => ({ label: g.label, amount: Math.max(0, (+g.target||0) - (+g.saved||0)) })),
    [goals]
  );
  const totalRemaining = useMemo(
    () => donutItems.reduce((s, i) => s + (+i.amount || 0), 0),
    [donutItems]
  );

  const setItems = async (next) => update({ goals: next });

  if (!uid) return <section className="budget-wrap"><p>Please sign in to save and sync your savings goals.</p></section>;
  if (!ready) return <section className="budget-wrap"><p>Loading savings…</p></section>;

  return (
    <section className="budget-wrap">
      <h2 style={{margin:"0 0 12px"}}>Savings Goals</h2>
      <div className="budget-grid">
        <BudgetCircle items={donutItems} total={totalRemaining} cap={0} remaining={0} over={0} />
        <BudgetTable mode="savings" items={goals} onChange={setItems} />
      </div>
    </section>
  );
}