import { monthKey } from "./money.js";

const KEY = "glasswallet.v1";

const blank = () => ({
  v: 1,
  currency: "₦",
  budget: 0,
  budgetMonth: monthKey(),
  expenses: [],
});

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return blank();
    return { ...blank(), ...parsed, expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [] };
  } catch {
    return blank();
  }
};

export const state = read();

export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the app still works for this session */
  }
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const inMonth = (iso, key = monthKey()) => {
  const d = new Date(iso);
  return monthKey(d) === key;
};

export const monthExpenses = () => state.expenses.filter((e) => inMonth(e.at));

export const spentThisMonth = () => monthExpenses().reduce((sum, e) => sum + e.amount, 0);

export const addExpense = ({ amount, category }) => {
  const entry = { id: uid(), amount: Math.max(0, Math.round(amount)), category, at: new Date().toISOString() };
  state.expenses.unshift(entry);
  save();
  return entry;
};

export const removeExpense = (id) => {
  const i = state.expenses.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const [gone] = state.expenses.splice(i, 1);
  save();
  return gone;
};

export const restoreExpense = (entry) => {
  if (!entry) return;
  state.expenses.unshift(entry);
  state.expenses.sort((a, b) => new Date(b.at) - new Date(a.at));
  save();
};

export const setBudget = (value) => {
  state.budget = Math.max(0, Math.round(value));
  state.budgetMonth = monthKey();
  save();
};

export const setCurrency = (symbol) => {
  state.currency = symbol.slice(0, 3) || "₦";
  save();
};

export const clearAll = () => {
  state.currency = state.currency || "₦";
  state.budget = 0;
  state.expenses = [];
  state.budgetMonth = monthKey();
  save();
};

/* amounts Jerry actually uses, so quick log stays two taps */
export const presets = () => {
  const seen = [];
  for (const e of monthExpenses()) {
    if (!seen.includes(e.amount)) seen.push(e.amount);
    if (seen.length === 3) break;
  }
  while (seen.length < 3) {
    const fallback = [500, 1000, 2000][seen.length];
    if (!seen.includes(fallback)) seen.push(fallback);
    else break;
  }
  return seen.slice(0, 3);
};

export const lastCategory = () => state.expenses[0]?.category || "food";

export const exportCsv = () => {
  const rows = [["Date", "Time", "Amount", "Category"].join(",")];
  [...state.expenses]
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .forEach((e) => {
      const d = new Date(e.at);
      rows.push(
        [
          d.toISOString().slice(0, 10),
          d.toTimeString().slice(0, 5),
          e.amount,
          e.category,
        ]
          .map((v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
          .join(",")
      );
    });
  return rows.join("\n");
};
