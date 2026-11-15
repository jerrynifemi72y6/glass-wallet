import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new",
  args: ["--no-sandbox","--disable-dev-shm-usage","--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://127.0.0.1:8100/", { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 900));

const immediate = await p.evaluate(() => {
  document.querySelector('[data-tab="history"]').click();
  const next = document.querySelector('.screen[data-screen="history"]');
  const prev = document.querySelector('.screen[data-screen="home"]');
  const cs = getComputedStyle(next);
  const kids = [...next.children].slice(0, 3).map((k) => getComputedStyle(k).animationName + "/" + getComputedStyle(k).animationDelay);
  return {
    anim: cs.animationName, dur: cs.animationDuration, op: cs.opacity, tf: cs.transform,
    prevLeaving: prev.classList.contains("is-leaving"),
    prevAnim: getComputedStyle(prev).animationName,
    running: next.getAnimations().map(a => a.animationName || a.constructor.name),
    kids,
  };
});

await new Promise(r => setTimeout(r, 120));
const midway = await p.evaluate(() => {
  const next = document.querySelector('.screen[data-screen="history"]');
  const cs = getComputedStyle(next);
  return { op: cs.opacity, tf: cs.transform, prevLeaving: document.querySelector('.screen[data-screen="home"]').classList.contains("is-leaving") };
});

await new Promise(r => setTimeout(r, 700));
const done = await p.evaluate(() => {
  const next = document.querySelector('.screen[data-screen="history"]');
  const cs = getComputedStyle(next);
  return { op: cs.opacity, tf: cs.transform, anims: next.getAnimations().length };
});

console.log(JSON.stringify({ immediate, midway, done }, null, 1));
await b.close();
