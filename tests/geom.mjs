import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => {
  const s = { v:1, currency:"₦", budget:40000, budgetMonth:"2026-11", expenses: [
    { id:"a", amount:33000, category:"food", at:new Date().toISOString() } ] };
  localStorage.setItem("glasswallet.v1", JSON.stringify(s));
});
await p.reload({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 2500));
const info = await p.evaluate(() => {
  const v = document.getElementById("vessel").getBoundingClientRect();
  const c = document.getElementById("liquid");
  return { v: { top: v.top, height: v.height, width: v.width }, cw: c.width, ch: c.height,
    scrub: getComputedStyle(document.querySelector(".screens")).height };
});
console.log(JSON.stringify(info));
await p.screenshot({ path: "tests/w-08-geom.png" });
await b.close();
