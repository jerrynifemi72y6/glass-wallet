import { Backdrop } from "./bg.js";
import { Liquid } from "./liquid.js";
import * as store from "./store.js";
import {
  CATEGORIES,
  catById,
  money,
  signed,
  compact,
  monthName,
  monthKey,
  dayLabel,
  timeLabel,
  daysLeftInMonth,
} from "./money.js";

const $ = (id) => document.getElementById(id);
const app = $("app");

const bg = new Backdrop($("bg"));
const liquid = new Liquid($("liquid"));

const PALETTES = {
  calm: ["#051d24", "#0a2c3e", "#1fae86"],
  warn: ["#1f160a", "#2e2410", "#d99a2e"],
  low: ["#241016", "#2c1320", "#d1455f"],
};

const ui = {
  budget: 0,
  spent: 0,
  pendingAmount: null,
  sheetMode: "amount",
  sheetValue: "",
  sheetCategory: null,
  justAdded: null,
  toast: 0,
  undoTimer: 0,
  undo: null,
};

/* ---------------- boot ---------------- */

const boot = () => {
  $("month-label").textContent = monthName();
  $("currency").value = store.state.currency;
  buildPad();
  wire();
  render({ animateLevel: true });
  app.classList.add("is-ready");

  if (!store.state.budget) {
    window.setTimeout(() => openSheet("budget"), 620);
  }
};

/* ---------------- rendering ---------------- */

const mood = (ratio) => (ratio > 0.5 ? "calm" : ratio > 0.2 ? "warn" : "low");

const liquidColors = {
  calm: ["#3ce9b0", "#0a6f5d"],
  warn: ["#ffd07f", "#a5651a"],
  low: ["#ff8fa3", "#7f1b2f"],
};

const render = ({ animateLevel = false } = {}) => {
  const currency = store.state.currency || "₦";
  const budget = store.state.budget;
  ui.spent = store.spentThisMonth();
  const remaining = budget - ui.spent;
  const ratio = budget > 0 ? Math.max(0, Math.min(1, remaining / budget)) : 0;

  $("remaining").textContent = budget ? signed(remaining, currency) : "No budget yet";
  $("of-budget").textContent = budget
    ? `of ${money(budget, currency)} budget · ${Math.max(0, Math.round((ui.spent / budget) * 100))}% used`
    : "Tap Change in settings to set one";

  $("fact-spent").textContent = money(ui.spent, currency);
  const dl = daysLeftInMonth();
  $("fact-days").textContent = String(dl);
  $("fact-perday").textContent = budget ? money(Math.max(0, remaining) / Math.max(1, dl), currency) : "—";

  // the glass
  const level = budget > 0 ? Math.min(0.93, ratio) : 0.08;
  liquid.setLevel(level, animateLevel);
  const m = mood(ratio);
  liquid.tint(...liquidColors[m]);
  bg.setPalette(PALETTES[m]);

  renderAmountChips();
  renderCatChips();
  renderRecent();
  renderHistory();
  $("budget-echo").textContent = budget ? money(budget, currency) : "Not set";
  $("currency").value = currency;
};

const renderAmountChips = () => {
  const currency = store.state.currency || "₦";
  const preset = store.presets();
  if (ui.pendingAmount === null) ui.pendingAmount = preset[0];
  const box = $("amount-chips");
  box.innerHTML = "";
  preset.forEach((amt) => {
    const b = document.createElement("button");
    b.className = "chip" + (ui.pendingAmount === amt ? " is-on" : "");
    b.innerHTML = `<span>${compact(amt, currency)}</span>`;
    b.addEventListener("click", () => {
      ui.pendingAmount = amt;
      renderAmountChips();
      haptic();
    });
    box.appendChild(b);
  });
  if (ui.pendingAmount) {
    $("quick-hint").textContent = `Next tap a category to log ${money(ui.pendingAmount, currency)}`;
  }
};

const renderCatChips = () => {
  const box = $("cat-chips");
  box.innerHTML = "";
  CATEGORIES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.innerHTML = `<i class="chip__dot" style="--dot:${c.color}"></i><span>${c.name}</span>`;
    b.addEventListener("click", () => quickLog(c.id));
    box.appendChild(b);
  });
};

const rowHtml = (e, withTime) => {
  const c = catById(e.category);
  const cur = store.state.currency || "₦";
  return `<div class="row${e.id === ui.justAdded ? " is-new" : ""}" data-id="${e.id}">
    <span class="row__dot" style="--dot:${c.color}"></span>
    <span class="row__main">
      <span class="row__title">${c.name}</span>
      <span class="row__sub">${withTime ? dayLabel(e.at) + " · " : ""}${timeLabel(e.at)}</span>
    </span>
    <span class="row__amt">${money(e.amount, cur)}</span>
    <button class="row__x" data-del="${e.id}" aria-label="Delete">✕</button>
  </div>`;
};

const renderRecent = () => {
  const list = store.monthExpenses().slice(0, 3);
  const box = $("recent");
  if (!list.length) {
    box.innerHTML = `<div class="empty glass">Nothing logged this month yet.<br />Tap an amount, then a category.</div>`;
    return;
  }
  box.innerHTML = list.map((e) => rowHtml(e, false)).join("");
  bindRows(box);
};

const renderHistory = () => {
  const list = [...store.monthExpenses()].sort((a, b) => new Date(b.at) - new Date(a.at));
  const box = $("history");
  if (!list.length) {
    box.innerHTML = `<div class="empty glass">No spends logged this month.</div>`;
    return;
  }
  const groups = new Map();
  list.forEach((e) => {
    const k = new Date(e.at).toDateString();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  });
  let html = "";
  let total = 0;
  groups.forEach((items) => {
    const dayTotal = items.reduce((s, e) => s + e.amount, 0);
    total += dayTotal;
    html += `<p class="day-head">${dayLabel(items[0].at)} · ${money(dayTotal, store.state.currency)}</p>`;
    html += items.map((e) => rowHtml(e, false)).join("");
  });
  html += `<p class="foot">${list.length} spends · ${money(total, store.state.currency)} this month</p>`;
  box.innerHTML = html;
  bindRows(box);
};

const bindRows = (box) => {
  box.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = btn.dataset.del;
      const gone = store.removeExpense(id);
      if (!gone) return;
      liquid.splash(1.1);
      render();
      showToast("Deleted", () => {
        store.restoreExpense(gone);
        render();
      });
    });
  });
};

/* ---------------- logging ---------------- */

const quickLog = (categoryId) => {
  const amount = ui.pendingAmount;
  if (!amount || amount <= 0) {
    openSheet("amount");
    return;
  }
  store.addExpense({ amount, category: categoryId });
  ui.justAdded = store.state.expenses[0].id;
  liquid.splash(2.4);
  haptic();
  render();
  const c = catById(categoryId);
  showToast(`${money(amount, store.state.currency)} · ${c.name} logged`, () => {
    const gone = store.removeExpense(ui.justAdded);
    ui.justAdded = null;
    if (gone) {
      render();
    }
  });
};

/* ---------------- sheet ---------------- */

const buildPad = () => {
  const pad = $("pad");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"];
  pad.innerHTML = "";
  keys.forEach((k) => {
    const b = document.createElement("button");
    b.className = "key" + (k === "⌫" ? " key--ghost" : "");
    b.textContent = k;
    b.addEventListener("click", () => onKey(k));
    pad.appendChild(b);
  });
};

const onKey = (k) => {
  if (k === "⌫") ui.sheetValue = ui.sheetValue.slice(0, -1);
  else if (ui.sheetValue.length < 9) ui.sheetValue = (ui.sheetValue + k).replace(/^0+(?=\d)/, "");
  paintSheet();
  haptic(6);
};

const paintSheet = () => {
  const cur = store.state.currency || "₦";
  const n = Number(ui.sheetValue || 0);
  const el = $("sheet-amount");
  el.textContent = money(n, cur);
  el.classList.remove("is-pop");
  void el.offsetWidth;
  el.classList.add("is-pop");
  $("sheet-confirm").disabled = n <= 0;
  $("sheet-confirm").textContent = ui.sheetMode === "budget" ? "Set budget" : "Log spend";
  $("sheet-label").textContent = ui.sheetMode === "budget" ? "Monthly budget" : "Log a spend";
  $("sheet-cats").style.display = ui.sheetMode === "budget" ? "none" : "flex";
};

const openSheet = (mode) => {
  ui.sheetMode = mode;
  ui.sheetValue = mode === "budget" && store.state.budget ? String(store.state.budget) : "";
  paintSheet();
  renderSheetCats();
  $("scrim").classList.add("is-on");
  $("sheet").classList.add("is-on");
};

const closeSheet = () => {
  $("scrim").classList.remove("is-on");
  $("sheet").classList.remove("is-on");
};

const renderSheetCats = () => {
  const box = $("sheet-cats");
  box.innerHTML = "";
  CATEGORIES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.innerHTML = `<i class="chip__dot" style="--dot:${c.color}"></i><span>${c.name}</span>`;
    b.addEventListener("click", () => {
      const n = Number(ui.sheetValue || 0);
      if (n <= 0) return;
      store.addExpense({ amount: n, category: c.id });
      ui.justAdded = store.state.expenses[0].id;
      liquid.splash(2.6);
      haptic();
      closeSheet();
      render();
      showToast(`${money(n, store.state.currency)} · ${c.name} logged`, () => {
        const gone = store.removeExpense(ui.justAdded);
        ui.justAdded = null;
        if (gone) render();
      });
    });
    box.appendChild(b);
  });
};

/* ---------------- export ---------------- */

const exportCsv = async () => {
  const csv = store.exportCsv();
  const name = `glass-wallet-${monthKey()}.csv`;
  try {
    const file = new File([csv], name, { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Glass Wallet" });
      showToast("CSV shared");
      return;
    }
  } catch {
    /* fall through to a plain download */
  }
  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast("CSV downloaded");
  } catch {
    try {
      await navigator.clipboard.writeText(csv);
      showToast("CSV copied to clipboard");
    } catch {
      showToast("Could not export on this device");
    }
  }
};

/* ---------------- toast ---------------- */

const showToast = (text, undo) => {
  const el = $("toast");
  $("toast-text").textContent = text;
  el.classList.add("is-on");
  ui.undo = undo || null;
  $("toast-action").style.display = undo ? "" : "none";
  clearTimeout(ui.toast);
  ui.toast = window.setTimeout(() => {
    el.classList.remove("is-on");
    ui.undo = null;
  }, 4600);
};

/* ---------------- haptics ---------------- */

const haptic = (ms = 10) => {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
};

/* ---------------- tabs ---------------- */

const movePill = () => {
  const active = document.querySelector(".dock__btn.is-active");
  const pill = $("dock-pill");
  if (!active || !pill) return;
  const dock = $("dock");
  const w = active.offsetWidth;
  pill.style.width = `${w - 6}px`;
  pill.style.transform = `translate3d(${active.offsetLeft - dock.clientLeft}px, 0, 0)`;
};

const setTab = (tab) => {
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.toggle("is-active", s.dataset.screen === tab);
  });
  document.querySelectorAll(".dock__btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.tab === tab);
  });
  movePill();
  haptic(6);
};

/* ---------------- wiring ---------------- */

const wire = () => {
  document.querySelectorAll(".dock__btn").forEach((b) => {
    b.addEventListener("click", () => setTab(b.dataset.tab));
  });
  $("btn-settings").addEventListener("click", () => setTab("settings"));
  $("btn-custom").addEventListener("click", () => openSheet("amount"));
  $("sheet-close").addEventListener("click", closeSheet);
  $("scrim").addEventListener("click", closeSheet);
  $("sheet-confirm").addEventListener("click", () => {
    const n = Number(ui.sheetValue || 0);
    if (n <= 0) return;
    if (ui.sheetMode === "budget") {
      store.setBudget(n);
      closeSheet();
      render();
      liquid.splash(1.8);
      showToast(`Budget set to ${money(n, store.state.currency)}`, () => {
        store.setBudget(0);
        render();
      });
    } else {
      store.addExpense({ amount: n, category: store.lastCategory() });
      ui.justAdded = store.state.expenses[0].id;
      closeSheet();
      liquid.splash(2.6);
      haptic();
      render();
      showToast(`${money(n, store.state.currency)} logged`, () => {
        const gone = store.removeExpense(ui.justAdded);
        ui.justAdded = null;
        if (gone) render();
      });
    }
  });

  $("btn-budget").addEventListener("click", () => openSheet("budget"));
  $("btn-export").addEventListener("click", exportCsv);
  $("btn-export-2").addEventListener("click", exportCsv);

  $("currency").addEventListener("change", (e) => {
    store.setCurrency(e.target.value.trim() || "₦");
    render();
  });

  $("btn-newmonth").addEventListener("click", () => {
    const removed = store.monthExpenses();
    if (!removed.length) {
      showToast("Nothing logged this month");
      return;
    }
    removed.forEach((e) => store.removeExpense(e.id));
    render();
    showToast(`Cleared ${removed.length} spends`, () => {
      removed.forEach((e) => store.restoreExpense(e));
      render();
    });
  });

  $("btn-clear").addEventListener("click", () => {
    const backup = JSON.parse(JSON.stringify(store.state));
    store.clearAll();
    render();
    showToast("Everything deleted", () => {
      store.state.budget = backup.budget;
      store.state.expenses = backup.expenses;
      store.save();
      render();
    });
  });

  $("toast-action").addEventListener("click", () => {
    const fn = ui.undo;
    ui.undo = null;
    $("toast").classList.remove("is-on");
    clearTimeout(ui.toast);
    if (fn) fn();
  });

  // press feel
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    b.classList.add("is-pressed");
    window.setTimeout(() => b.classList.remove("is-pressed"), 240);
  });

  // tilt: real sensor on the phone, drag anywhere as a fallback
  let dragging = false;
  let dragX = 0;
  const vessel = $("vessel");
  const hint = $("tilt-hint");

  const sensor = (e) => {
    if (e.gamma == null) return;
    liquid.setTilt(e.gamma / 32);
    if (Math.abs(e.gamma) > 6) hint.classList.add("is-gone");
  };

  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", sensor, true);
  }

  vessel.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragX = e.clientX;
    vessel.setPointerCapture?.(e.pointerId);
    hint.classList.add("is-gone");
  });
  vessel.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    liquid.setTilt(Math.max(-1, Math.min(1, dx / 90)));
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    liquid.setTilt(0);
    liquid.splash(0.8);
  };
  vessel.addEventListener("pointerup", endDrag);
  vessel.addEventListener("pointercancel", endDrag);
  vessel.addEventListener("pointerleave", endDrag);

  window.addEventListener("resize", movePill);
  window.addEventListener("orientationchange", () => setTimeout(movePill, 250));
};

boot();
