import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const outDir = path.resolve("release/screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1400, height: 920, deviceScaleFactor: 2 },
  args: ["--hide-scrollbars", "--disable-gpu"],
});

const page = await browser.newPage();
page.setDefaultTimeout(30000);
await page.goto("http://localhost:1420/?md=/examples/full-syntax.md", {
  waitUntil: "networkidle0",
  timeout: 60000,
});
await page.waitForFunction(
  () => document.body.innerText.includes("完整语法测试文件") && document.querySelector(".md-body h1"),
);
await page.waitForSelector(".alert, .matter", { timeout: 10000 }).catch(() => undefined);
await new Promise((r) => setTimeout(r, 2800));

const shot = async (name) => {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log("wrote", file);
};

await shot("01-top");

const scrollTo = async (needle) => {
  await page.evaluate((text) => {
    const reader = document.querySelector(".reader");
    if (!reader) return;
    const el = [...reader.querySelectorAll("h1,h2,h3,p,aside,.code-card,.mermaid-card")].find((n) =>
      (n.textContent || "").includes(text),
    );
    if (!el) return;
    const rootBox = reader.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();
    reader.scrollTop += elBox.top - rootBox.top - 12;
  }, needle);
  await new Promise((r) => setTimeout(r, 400));
};

await scrollTo("支持下标");
await shot("02-subsup");

await scrollTo("3. 列表");
await shot("03-lists");

await scrollTo("带语言的代码块");
await shot("04-code");

await scrollTo("7. 表格");
await shot("05-table");

await scrollTo("9. 数学公式");
await shot("06-math");

await scrollTo("10. Mermaid");
await shot("07-mermaid");

await scrollTo("11. 脚注");
await shot("08-footnotes");

await scrollTo("13. 强调与特殊语法");
await shot("09-emphasis");

const paper = await page.$(".paper");
if (paper) {
  await paper.screenshot({ path: path.join(outDir, "00-full-paper.png"), type: "png" });
  console.log("wrote full paper");
}

await browser.close();
