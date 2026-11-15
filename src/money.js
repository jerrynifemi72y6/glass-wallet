export const CATEGORIES = [
  { id: "food", name: "Food", color: "#ffb36b" },
  { id: "transport", name: "Transport", color: "#6bc6ff" },
  { id: "data", name: "Data", color: "#a78bfa" },
  { id: "fun", name: "Fun", color: "#ff7bac" },
  { id: "bills", name: "Bills", color: "#7ee0b8" },
  { id: "other", name: "Other", color: "#cfd6e4" },
];

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[5];

const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const money = (n, currency = "₦") => `${currency}${group(Math.abs(n))}`;

export const signed = (n, currency = "₦") => `${n < 0 ? "-" : ""}${money(n, currency)}`;

export const compact = (n, currency = "₦") => {
  if (n >= 1000000) return `${currency}${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}m`;
  if (n >= 1000) return `${currency}${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`;
  return `${currency}${Math.round(n)}`;
};

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const monthName = (d = new Date()) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const dayKey = (d) => new Date(d).toDateString();

export const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 864e5));
  if (dayKey(d) === today) return "Today";
  if (dayKey(d) === yesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

export const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const daysLeftInMonth = () => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, end - now.getDate() + 1);
};

export const csvEscape = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
