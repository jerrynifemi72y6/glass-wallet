import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => {
  const now = Date.now();
  const rows = [
    [1200, "food", 0], [800, "transport", 40], [2500, "data", 120],
    [500, "fun", 300], [3000, "bills", 900],
  ];
  const s = { v:1, currency:"₦", budget:50000, budgetMonth:new Date().toISOString().slice(0,7),
    expenses: rows.map(([amount, category, mins], i) => ({
      id: "p"+i, amount, category, at: new Date(now - mins * 60000).toISOString() })) };
  localStorage.setItem("glasswallet.v1", JSON.stringify(s));
});
await p.reload({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 2200));
await p.screenshot({ path: "../wallet-preview.png" });
await b.close();
