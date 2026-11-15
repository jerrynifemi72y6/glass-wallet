import puppeteer from "puppeteer-core";

const URL = process.env.URL || "http://127.0.0.1:8100/";
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ""}`));
page.on("response", (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await sleep(1200);
await page.screenshot({ path: "tests/w-01-onboarding.png" });

const onboard = await page.evaluate(() => document.getElementById("sheet").classList.contains("is-on"));

const tapKey = async (label) => {
  await page.evaluate((l) => {
    const k = [...document.querySelectorAll(".key")].find((b) => b.textContent.trim() === l);
    if (k) k.click();
  }, label);
  await sleep(60);
};

for (const k of ["1", "2", "0", "0", "00", "0"]) await tapKey(k);
const sheetAmount = await page.evaluate(() => document.getElementById("sheet-amount").textContent);
await page.screenshot({ path: "tests/w-02-budget-sheet.png" });
await page.click("#sheet-confirm");
await sleep(900);
await page.screenshot({ path: "tests/w-03-funded.png" });

const afterBudget = await page.evaluate(() => ({
  remaining: document.getElementById("remaining").textContent,
  sub: document.getElementById("of-budget").textContent,
  perday: document.getElementById("fact-perday").textContent,
  budget: JSON.parse(localStorage.getItem("glasswallet.v1")).budget,
}));

// two-tap quick log
await page.click("#amount-chips .chip");
await sleep(120);
const chipOn = await page.evaluate(() => document.querySelectorAll("#amount-chips .chip.is-on").length);
await page.evaluate(() => document.querySelectorAll("#cat-chips .chip")[0].click());
await sleep(900);
await page.screenshot({ path: "tests/w-04-logged.png" });

const afterLog = await page.evaluate(() => ({
  remaining: document.getElementById("remaining").textContent,
  spent: document.getElementById("fact-spent").textContent,
  recent: document.querySelectorAll("#recent .row").length,
  toast: document.getElementById("toast-text").textContent,
  stored: JSON.parse(localStorage.getItem("glasswallet.v1")).expenses.length,
}));

// a couple more spends across categories for a fuller history
for (const i of [1, 2, 3]) {
  await page.evaluate((idx) => document.querySelectorAll("#cat-chips .chip")[idx % 6].click(), i);
  await sleep(280);
}
await page.click('[data-tab="history"]');
await sleep(700);
await page.screenshot({ path: "tests/w-05-history.png" });
const history = await page.evaluate(() => ({
  rows: document.querySelectorAll("#history .row").length,
  days: document.querySelectorAll(".day-head").length,
  foot: document.querySelector(".foot")?.textContent,
}));

// delete + undo
await page.evaluate(() => document.querySelector("#history .row__x").click());
await sleep(600);
const afterDelete = await page.evaluate(() => ({
  rows: document.querySelectorAll("#history .row").length,
  toast: document.getElementById("toast-text").textContent,
}));
await page.click("#toast-action");
await sleep(600);
const afterUndo = await page.evaluate(() => document.querySelectorAll("#history .row").length);

await page.click('[data-tab="settings"]');
await sleep(700);
await page.screenshot({ path: "tests/w-06-settings.png" });

// reload to prove persistence
await page.reload({ waitUntil: "domcontentloaded" });
await sleep(1200);
const persisted = await page.evaluate(() => ({
  remaining: document.getElementById("remaining").textContent,
  sheetOpen: document.getElementById("sheet").classList.contains("is-on"),
}));

const csv = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("glasswallet.v1"));
  return `${raw.expenses.length} expenses stored, budget ${raw.budget}`;
});

console.log(JSON.stringify({ onboard, sheetAmount, afterBudget, chipOn, afterLog, history, afterDelete, afterUndo, persisted, csv }, null, 1));
console.log("--- logs ---");
console.log(logs.filter((l) => !l.includes("GL Driver")).join("\n") || "(none)");
await browser.close();
