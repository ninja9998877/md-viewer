import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1400, height: 800 },
});
const page = await browser.newPage();
await page.goto("http://localhost:1420/?md=/examples/full-syntax.md", {
  waitUntil: "networkidle0",
  timeout: 60000,
});
await page.waitForFunction(() => document.body.innerText.includes("完整语法测试文件"));
await new Promise((r) => setTimeout(r, 600));
await page.click(".chrome__ghost");
await page.waitForSelector(".chrome__done");
await page.waitForSelector(".cm-content");

const reader = async () =>
  page.evaluate(() => {
    const el = document.querySelector(".reader");
    const h = [...el.querySelectorAll("h1,h2")].find((n) => {
      const y = n.getBoundingClientRect().top;
      return y > 60 && y < 700;
    });
    return {
      top: Math.round(el.scrollTop),
      h: h?.textContent?.slice(0, 24) ?? null,
      y: h ? Math.round(h.getBoundingClientRect().top) : null,
    };
  });

await page.click(".cm-content");
await page.keyboard.press("End");
const before = await reader();
await page.keyboard.type(" abc", { delay: 40 });
await new Promise((r) => setTimeout(r, 200));
const samples = [];
for (let i = 0; i < 12; i++) {
  samples.push(await reader());
  await new Promise((r) => setTimeout(r, 50));
}
await page.keyboard.type(" more text here", { delay: 30 });
await new Promise((r) => setTimeout(r, 250));
for (let i = 0; i < 12; i++) {
  samples.push(await reader());
  await new Promise((r) => setTimeout(r, 50));
}

const tops = samples.map((s) => s.top);
const uniqueTops = [...new Set(tops)];
const last8 = tops.slice(-8);
const lastUnique = [...new Set(last8)];
const yDrift = samples
  .filter((s) => s.h && s.h === samples[samples.length - 1].h && s.y != null)
  .map((s) => s.y);
const ySpan = yDrift.length ? Math.max(...yDrift) - Math.min(...yDrift) : 0;

const result = { before, uniqueTops, lastUnique, ySpan, last: samples[samples.length - 1] };
console.log(JSON.stringify(result, null, 2));
await browser.close();

if (lastUnique.length > 2) {
  console.error("FAIL: preview scroll kept moving after typing");
  process.exit(1);
}
if (ySpan > 24) {
  console.error("FAIL: heading jumped while idle", ySpan);
  process.exit(1);
}
console.log("OK");
