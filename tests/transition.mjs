import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1000));
await p.evaluate(() => {
  const s = { v:1, currency:"₦", budget:50000, budgetMonth:new Date().toISOString().slice(0,7),
    expenses: [{ id:"a", amount:9000, category:"food", at:new Date().toISOString() },
               { id:"b", amount:4500, category:"transport", at:new Date(Date.now()-86400000).toISOString() }] };
  localStorage.setItem("glasswallet.v1", JSON.stringify(s));
});
await p.reload({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1200));

const pillHome = await p.evaluate(() => {
  const p = document.getElementById("dock-pill");
  return { left: p.style.left, width: p.style.width };
});

await p.click('[data-tab="history"]');
await new Promise(r => setTimeout(r, 90));
await p.screenshot({ path: "tests/t-01-mid.png" });
const mid = await p.evaluate(() => {
  const s = document.querySelector('.screen[data-screen="history"]');
  const h = document.querySelector('.screen[data-screen="home"]');
  const f = document.getElementById("flash");
  return {
    vars: [s.style.getPropertyValue("--in"), s.style.getPropertyValue("--out")],
    anim: getComputedStyle(s).animationName,
    leaving: h.classList.contains("is-leaving"),
    leavingAnim: getComputedStyle(h).animationName,
    opacity: getComputedStyle(s).opacity,
    transform: getComputedStyle(s).transform,
    flash: f.classList.contains("is-on"),
    pill: document.getElementById("dock-pill").style.left,
  };
});
await new Promise(r => setTimeout(r, 700));
await p.screenshot({ path: "tests/t-02-settled.png" });
const settled = await p.evaluate(() => {
  const s = document.querySelector('.screen[data-screen="history"]');
  const h = document.querySelector('.screen[data-screen="home"]');
  return { opacity: getComputedStyle(s).opacity, leaving: h.classList.contains("is-leaving"),
    homeHidden: getComputedStyle(h).visibility, pill: document.getElementById("dock-pill").style.left };
});

await p.click('[data-tab="home"]');
await new Promise(r => setTimeout(r, 700));
await p.screenshot({ path: "tests/t-03-back.png" });
const back = await p.evaluate(() => ({
  pill: document.getElementById("dock-pill").style.left,
  homeActive: document.querySelector('.screen[data-screen="home"]').classList.contains("is-active"),
  inDir: document.querySelector('.screen[data-screen="home"]').style.getPropertyValue("--in"),
}));

console.log(JSON.stringify({ pillHome, mid, settled, back, errs }, null, 1));
await b.close();
