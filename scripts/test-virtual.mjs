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
await new Promise((r) => setTimeout(r, 800));

const top = await page.evaluate(() => ({
  sections: document.querySelectorAll("[data-section]").length,
  h1: document.body.innerText.includes("墨页完整语法测试文件"),
  alerts: document.querySelectorAll(".alert").length,
}));

await page.click("button[title='目录（O）']");
await page.waitForSelector(".toc__item button");
await page.evaluate(() => {
  const btn = [...document.querySelectorAll(".toc__item button")].find((b) =>
    (b.textContent || "").includes("Mermaid"),
  );
  btn?.click();
});
await new Promise((r) => setTimeout(r, 500));

const afterJump = await page.evaluate(() => {
  const heading = [...document.querySelectorAll("h1,h2,h3")].find((h) =>
    (h.textContent || "").includes("Mermaid"),
  );
  const reader = document.querySelector(".reader");
  return {
    scrollTop: reader?.scrollTop ?? 0,
    mermaidVisible: !!heading,
    mermaidTop: heading?.getBoundingClientRect().top ?? null,
    sections: document.querySelectorAll("[data-section]").length,
  };
});

console.log(JSON.stringify({ top, afterJump }, null, 2));
await page.screenshot({ path: "release/screenshots/13-virtual-jump.png" });
await browser.close();
if (!top.h1 || afterJump.scrollTop < 100 || !afterJump.mermaidVisible) process.exit(1);
