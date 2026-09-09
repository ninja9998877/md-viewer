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
await new Promise((r) => setTimeout(r, 700));
await page.click("button.chrome__ghost");
await page.waitForSelector(".cm-scroller");
await new Promise((r) => setTimeout(r, 400));

const result = await page.evaluate(async () => {
  const reader = document.querySelector(".reader");
  const scroller = document.querySelector(".cm-scroller");
  if (!reader || !scroller) return { ok: false, reason: "missing panes" };

  scroller.scrollTop = scroller.scrollHeight;
  await new Promise((r) => setTimeout(r, 250));

  const max = reader.scrollHeight - reader.clientHeight;
  const ratio = max <= 0 ? 1 : reader.scrollTop / max;
  const last = [...document.querySelectorAll("h1,h2,h3")].at(-1);
  const lastBox = last?.getBoundingClientRect();
  const readerBox = reader.getBoundingClientRect();
  const lastVisible =
    !!lastBox && lastBox.top < readerBox.bottom - 8 && lastBox.bottom > readerBox.top + 8;

  return {
    ok: ratio > 0.85 && lastVisible,
    ratio,
    readerScroll: reader.scrollTop,
    readerMax: max,
    lastText: last?.textContent ?? null,
    lastTop: lastBox?.top ?? null,
    readerBottom: readerBox.bottom,
    editorAtEnd: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 16,
  };
});

console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: "release/screenshots/12-scroll-bottom.png" });
await browser.close();
process.exit(result.ok ? 0 : 1);
