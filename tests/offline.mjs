import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
p.on("pageerror", e => errs.push(e.message));
await p.goto("http://127.0.0.1:8100/", { waitUntil: "load" });
await new Promise(r => setTimeout(r, 2500));
const reg = await p.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { scope: r?.scope, active: !!r?.active, state: r?.active?.state };
});
const apk = await p.evaluate(async () => {
  const r = await fetch("./GlassWallet.apk", { method: "HEAD" });
  return { status: r.status, type: r.headers.get("content-type"), len: r.headers.get("content-length") };
});
// go offline and reload
await p.setOfflineMode(true);
await p.reload({ waitUntil: "domcontentloaded" }).catch(e => errs.push("reload: " + e.message));
await new Promise(r => setTimeout(r, 1500));
const offline = await p.evaluate(() => ({
  ready: document.getElementById("app").classList.contains("is-ready"),
  title: document.querySelector("h1")?.textContent,
  keys: document.querySelectorAll(".key").length,
  remaining: document.getElementById("remaining").textContent,
}));
console.log(JSON.stringify({ reg, offline, apk, errs }, null, 1));
await b.close();
