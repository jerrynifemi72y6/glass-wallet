import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => document.querySelector('[data-tab="history"]').click());
await p.screenshot({ path: "tests/f-0.png" });
await new Promise(r => setTimeout(r, 110));
await p.screenshot({ path: "tests/f-1.png" });
await new Promise(r => setTimeout(r, 110));
await p.screenshot({ path: "tests/f-2.png" });
await new Promise(r => setTimeout(r, 600));
await p.screenshot({ path: "tests/f-3.png" });
await b.close();
