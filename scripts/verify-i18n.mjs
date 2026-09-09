import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
await page.goto("http://localhost:1420/", { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.removeItem("moye-locale"));
await page.reload({ waitUntil: "networkidle0" });

const read = () =>
  page.evaluate(() => ({
    lang: document.documentElement.lang,
    open: [...document.querySelectorAll(".chrome__left button")].map((b) => b.textContent.trim())[0],
    edit: document.querySelector(".chrome__ghost")?.textContent?.trim(),
    h1: document.querySelector(".md-body h1")?.textContent,
  }));

const before = await read();
await page.click('button[title="Switch to English"]');
await new Promise((r) => setTimeout(r, 250));
const after = await read();
await page.click('button[title="切换到中文"]');
await new Promise((r) => setTimeout(r, 250));
const back = await read();
console.log(JSON.stringify({ before, after, back }, null, 2));
await browser.close();

if (after.open !== "Open" || after.h1 !== "Start reading" || after.lang !== "en") {
  console.error("FAIL en");
  process.exit(1);
}
if (back.open !== "打开" || back.h1 !== "开始阅读" || back.lang !== "zh-CN") {
  console.error("FAIL zh");
  process.exit(1);
}
console.log("OK");
