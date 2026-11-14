// Screenshots for visual review: node tools/shots.mjs [baseUrl] [path ...]
// Saves full-page desktop and mobile captures to _shots/ (git-ignored) and prints
// console errors and failed requests.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const paths = process.argv.slice(3);
const targets = paths.length ? paths : ["/en", "/az"];
const exe =
  process.env.CHROME_PATH ??
  "C:/Users/User/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

mkdirSync("_shots", { recursive: true });
const browser = await chromium.launch({ executablePath: exe, headless: true });
for (const [name, viewport] of [["desk", { width: 1440, height: 900 }], ["mob", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("console", (m) => m.type() === "error" && console.log(`[${name}] console:`, m.text().slice(0, 300)));
  page.on("requestfailed", (r) => console.log(`[${name}] failed:`, r.url()));
  for (const p of targets) {
    const res = await page.goto(base + p, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(Number(process.env.WAIT ?? 3500));
    const file = `_shots/${name}${p.replace(/[/?=&]+/g, "_")}.png`;
    await page.screenshot({ path: file, fullPage: process.env.FULL !== "0" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(name, p, res?.status(), file, overflow > 0 ? `H-OVERFLOW ${overflow}px` : "");
  }
  await page.close();
}
await browser.close();
