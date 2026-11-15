import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 900));
// seed a tight budget: 40,000 with 33,000 spent
await p.evaluate(() => {
  const s = { v:1, currency:"₦", budget:40000, budgetMonth:new Date().toISOString().slice(0,7),
    expenses: [] };
  const now = Date.now();
  [12000, 8000, 7000, 6000].forEach((amt, i) => s.expenses.push({
    id: "seed"+i, amount: amt, category: ["food","transport","data","fun"][i],
    at: new Date(now - i * 3600_000).toISOString()
  }));
  localStorage.setItem("glasswallet.v1", JSON.stringify(s));
});
await p.reload({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1400));
await p.screenshot({ path: "tests/w-07-low.png" });
const info = await p.evaluate(() => ({
  remaining: document.getElementById("remaining").textContent,
  sub: document.getElementById("of-budget").textContent,
  perday: document.getElementById("fact-perday").textContent,
}));
console.log(JSON.stringify(info));
await b.close();
