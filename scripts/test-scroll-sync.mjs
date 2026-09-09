import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1400, height: 920 },
});
const page = await browser.newPage();
await page.goto("http://localhost:1420/?md=/examples/full-syntax.md", {
  waitUntil: "networkidle0",
  timeout: 60000,
});
await page.waitForFunction(() => document.body.innerText.includes("完整语法测试文件"));
await new Promise((r) => setTimeout(r, 600));

await page.click("button.chrome__ghost");
await page.waitForSelector(".cm-scroller");
await new Promise((r) => setTimeout(r, 400));

const result = await page.evaluate(async () => {
  const reader = document.querySelector(".reader");
  const scroller = document.querySelector(".cm-scroller");
  if (!reader || !scroller) return { ok: false, reason: "missing panes" };
  const before = reader.scrollTop;
  const tagged = document.querySelectorAll("[data-source-line]").length;
  scroller.scrollTop = Math.min(scroller.scrollHeight, 2800);
  await new Promise((r) => setTimeout(r, 200));
  const after = reader.scrollTop;
  const sample = [...document.querySelectorAll("[data-source-line]")]
    .slice(0, 6)
    .map((el) => `${el.tagName.toLowerCase()}:${el.getAttribute("data-source-line")}`);
  return {
    ok: after > before + 80,
    before,
    after,
    tagged,
    sample,
    editorScroll: scroller.scrollTop,
  };
});

console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: "release/screenshots/11-scroll-sync.png" });
await browser.close();
process.exit(result.ok ? 0 : 1);
