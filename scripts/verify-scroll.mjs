import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto("http://localhost:1420/?md=/examples/full-syntax.md", {
  waitUntil: "networkidle0",
  timeout: 60000,
});
await page.waitForFunction(() => document.body.innerText.includes("完整语法测试文件"));
await new Promise((r) => setTimeout(r, 800));

const report = await page.evaluate(async () => {
  const reader = document.querySelector(".reader");
  if (!reader) return { error: "no reader" };
  const samples = [];
  const step = 120;
  const max = reader.scrollHeight - reader.clientHeight;
  for (let top = 0; top <= max + 400; top += step) {
    reader.scrollTop = top;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 40));
    const h1 = [...reader.querySelectorAll("h1,h2")].find((el) => {
      const box = el.getBoundingClientRect();
      return box.top > 40 && box.top < 700;
    });
    const cs = getComputedStyle(reader);
    samples.push({
      want: top,
      got: Math.round(reader.scrollTop),
      readerW: reader.clientWidth,
      scrollW: reader.scrollWidth,
      hBar: reader.scrollWidth > reader.clientWidth + 1,
      bodyBar: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      extraY: [...document.querySelectorAll("*")].filter((el) => {
        if (el === reader) return false;
        const s = getComputedStyle(el);
        return (
          (s.overflowY === "auto" || s.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 4 &&
          el.getBoundingClientRect().height > 0
        );
      }).length,
      heading: h1?.textContent?.slice(0, 24) ?? null,
      headingY: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
      clientH: reader.clientHeight,
    });
    if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 2) break;
  }
  const widths = new Set(samples.map((s) => s.readerW));
  const heights = new Set(samples.map((s) => s.clientH));
  const hBars = samples.filter((s) => s.hBar).length;
  const bodyBars = samples.filter((s) => s.bodyBar).length;
  return {
    samples: samples.length,
    uniqueReaderWidths: [...widths],
    uniqueClientHeights: [...heights],
    horizontalBarSamples: hBars,
    bodyBarSamples: bodyBars,
    first: samples[0],
    mid: samples[Math.floor(samples.length / 2)],
    last: samples[samples.length - 1],
  };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
const fail = [];
if (report.horizontalBarSamples) fail.push("reader horizontal bar");
if (report.bodyBarSamples) fail.push("body scrollbar");
if ((report.uniqueReaderWidths?.length ?? 0) > 1) fail.push("reader width jitter");
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("OK");
