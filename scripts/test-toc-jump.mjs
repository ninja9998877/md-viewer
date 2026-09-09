import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1400, height: 920, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto("http://localhost:1420/?md=/examples/full-syntax.md", {
  waitUntil: "networkidle0",
  timeout: 60000,
});
await page.waitForFunction(() => document.body.innerText.includes("完整语法测试文件"));
await new Promise((r) => setTimeout(r, 800));

await page.click("button[title='目录（O）']");
await page.waitForSelector(".toc__item button");

const before = await page.evaluate(() => document.querySelector(".reader")?.scrollTop ?? -1);
const labels = await page.$$eval(".toc__item button", (els) => els.map((e) => e.textContent));
const mermaidBtn = await page.evaluateHandle(() =>
  [...document.querySelectorAll(".toc__item button")].find((b) =>
    (b.textContent || "").includes("Mermaid"),
  ),
);
if (!mermaidBtn.asElement()) {
  console.log("FAIL no mermaid toc item", labels);
  await browser.close();
  process.exit(1);
}
await mermaidBtn.asElement().click();
await new Promise((r) => setTimeout(r, 700));
const after = await page.evaluate(() => {
  const reader = document.querySelector(".reader");
  const heading = [...document.querySelectorAll("h1,h2,h3")].find((h) =>
    (h.textContent || "").includes("Mermaid"),
  );
  const ids = [...document.querySelectorAll("h1[id],h2[id],h3[id]")].slice(0, 5).map((h) => h.id);
  return {
    scrollTop: reader?.scrollTop ?? -1,
    headingId: heading?.id ?? null,
    headingTop: heading?.getBoundingClientRect().top ?? null,
    sampleIds: ids,
  };
});
console.log(JSON.stringify({ before, after, labels: labels.slice(0, 8) }, null, 2));
await page.screenshot({ path: "release/screenshots/10-toc-jump.png" });
await browser.close();
if (after.scrollTop <= before) {
  process.exit(1);
}
