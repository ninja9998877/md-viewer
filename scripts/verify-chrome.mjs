import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const outDir = path.resolve("release/screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1100, height: 720, deviceScaleFactor: 2 },
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);

await page.goto("http://localhost:1420/", { waitUntil: "networkidle0" });
await page.evaluate(() => {
  localStorage.setItem(
    "md-viewer-recent",
    JSON.stringify([
      { path: "C:/Users/super/md-viewer/examples/full-syntax.md", name: "full-syntax.md", at: Date.now() },
      { path: "C:/Users/super/md-viewer/README.md", name: "README.md", at: Date.now() - 1000 },
    ]),
  );
});
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".chrome");
await page.click(".chrome__ghost");
await page.waitForSelector(".chrome__done");

const chromeMetrics = await page.evaluate(() => {
  const done = document.querySelector(".chrome__done");
  const toc = [...document.querySelectorAll(".chrome__right button")].find((b) => b.textContent?.includes("目录"));
  const assoc = [...document.querySelectorAll(".chrome__right button")].find((b) =>
    b.textContent?.includes("设为默认"),
  );
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: el.textContent?.replace(/\s+/g, " ").trim(),
      h: Math.round(r.height),
      w: Math.round(r.width),
      whiteSpace: cs.whiteSpace,
      lines: el.getClientRects().length,
    };
  };
  return {
    chromeH: document.querySelector(".chrome")?.getBoundingClientRect().height,
    done: box(done),
    toc: box(toc),
    assoc: box(assoc),
  };
});

await page.screenshot({ path: path.join(outDir, "14-edit-chrome.png") });

await page.click(".recent-wrap > button");
await page.waitForSelector(".recent-menu");

const menuMetrics = await page.evaluate(() => {
  const menu = document.querySelector(".recent-menu");
  const item = menu?.querySelector("button");
  const r = menu.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const stack = document.elementsFromPoint(x, y).map((el) => ({
    tag: el.tagName,
    className: el.className?.toString?.().slice(0, 80),
  }));
  return {
    menuTop: Math.round(r.top),
    menuBottom: Math.round(r.bottom),
    paperTop: Math.round(document.querySelector(".paper")?.getBoundingClientRect().top ?? 0),
    topHit: stack[0],
    inMenu: stack.some((s) => String(s.className).includes("recent-menu") || s.tag === "BUTTON"),
    stack: stack.slice(0, 6),
    itemText: item?.textContent?.trim(),
  };
});

const item = await page.$(".recent-menu button");
const itemBox = await item.boundingBox();
await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
await new Promise((r) => setTimeout(r, 120));
const hoverBg = await page.evaluate(() => {
  const el = document.querySelector(".recent-menu button");
  return getComputedStyle(el).backgroundColor;
});

await page.screenshot({ path: path.join(outDir, "15-recent-menu.png") });

const clickable = await page.evaluate(() => {
  const btn = document.querySelector(".recent-menu button");
  const r = btn.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + 20, r.top + r.height / 2);
  return hit === btn || btn.contains(hit);
});

console.log(
  JSON.stringify(
    { chromeMetrics, menuMetrics, hoverBg, clickable },
    null,
    2,
  ),
);

const fail = [];
if (chromeMetrics.done?.whiteSpace !== "nowrap") fail.push("done wraps");
if ((chromeMetrics.done?.h ?? 99) > 36) fail.push("done too tall");
if (chromeMetrics.toc?.whiteSpace !== "nowrap") fail.push("toc wraps");
if (!menuMetrics.inMenu) fail.push("menu buried");
if (!clickable) fail.push("menu not clickable");
if (hoverBg === "rgba(0, 0, 0, 0)" || hoverBg === "transparent") fail.push("no hover bg");

await browser.close();
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("OK");
