import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1500));
const info = await p.evaluate(() => ({
  ready: document.getElementById("app").classList.contains("is-ready"),
  keys: document.querySelectorAll(".key").length,
  sheetOn: document.getElementById("sheet").classList.contains("is-on"),
  sheetRect: document.getElementById("sheet").getBoundingClientRect().toJSON(),
  confirmRect: document.getElementById("sheet-confirm").getBoundingClientRect().toJSON(),
  remaining: document.getElementById("remaining").textContent,
}));
console.log(JSON.stringify(info, null, 1));
console.log("errors:", errs);
await b.close();
