// End-to-end smoke test in a real browser: books a bay through the UI and checks
// the job card, then logs into the admin board and finds the booking there.
// Usage: node tools/e2e.mjs [baseUrl]    (screenshots go to _shots/)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const exe =
  process.env.CHROME_PATH ??
  "C:/Users/User/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
const shot = process.env.SHOTS !== "0";
mkdirSync("_shots", { recursive: true });

const fail = (msg) => {
  console.log("FAIL", msg);
  process.exitCode = 1;
};

const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// 1. work
await page.goto(`${base}/en/book?s=brakes`, { waitUntil: "networkidle", timeout: 120000 });
const pressed = await page.locator('button[aria-pressed="true"]').count();
if (pressed !== 1) fail(`expected brakes preselected, got ${pressed}`);
await page.getByRole("button", { name: /Oil and filter change/ }).click();
if (shot) await page.screenshot({ path: "_shots/e2e-1-work.png" });
await page.getByRole("button", { name: "Next", exact: true }).click();

// 2. day: first enabled day that has a free slot
await page.waitForTimeout(400);
const dayButtons = await page.locator('form button[aria-pressed]:not([disabled])').all();
let booked = false;
for (const d of dayButtons) {
  await d.click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Checking the lifts"), null, { timeout: 30000 });
  await page.waitForTimeout(700);
  const slots = page.locator('button[aria-label*="free"]');
  if ((await slots.count()) > 0) {
    if (shot) await page.screenshot({ path: "_shots/e2e-2-time.png" });
    await slots.first().click();
    booked = true;
    break;
  }
  await page.getByRole("button", { name: "Back", exact: true }).click();
}
if (!booked) fail("no free slot found in two weeks");

// 3. contact, first with a bad phone to see the error
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByLabel("Name").fill("Test Driver");
await page.getByLabel("Phone").fill("12345");
await page.getByLabel("Car (make and model)").fill("Kia Rio");
await page.getByRole("button", { name: /Confirm booking/ }).click();
await page.waitForSelector("text=Use an Azerbaijani number", { timeout: 30000 }).catch(() => fail("phone error not shown"));
if (shot) await page.screenshot({ path: "_shots/e2e-3-error.png" });
await page.getByLabel("Phone").fill("050 123 45 67");
await page.getByRole("button", { name: /Confirm booking/ }).click();

// 4. job card
await page.waitForURL(/\/en\/booking\/R-[A-Z0-9]{5}$/, { timeout: 60000 }).catch(() => fail(`no redirect, at ${page.url()}`));
const code = page.url().split("/").pop();
await page.waitForSelector("text=Your job card", { timeout: 30000 });
await page.waitForTimeout(1800);
const text = await page.innerText("main");
if (!text.includes("Brake pads and discs") || !text.includes("Oil and filter change")) fail("job card misses services");
if (!text.includes("115 AZN")) fail("job card total is not 115 AZN");
if (shot) await page.screenshot({ path: "_shots/e2e-4-ticket.png", fullPage: true });
const ics = await page.request.get(`${base}/api/bookings/${code}/ics`);
if (!ics.ok() || !(await ics.text()).includes("BEGIN:VEVENT")) fail("ics download");

// 5. admin sees it
const res = await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
if (!page.url().endsWith("/admin/login")) fail(`admin not protected (${res?.status()})`);
await page.getByLabel("Password").fill("rampa-demo");
await page.getByRole("button", { name: /Sign in/ }).click();
await page.waitForURL(/\/admin(\?.*)?$/, { timeout: 30000 }).catch(() => fail("login failed"));
await page.goto(`${base}/admin?code=${code}`, { waitUntil: "networkidle" });
if (!(await page.innerText("main")).includes(code)) fail(`admin board does not show ${code}`);
if (shot) await page.screenshot({ path: "_shots/e2e-5-admin.png", fullPage: true });

if (errors.length) fail(`browser errors:\n  ${errors.slice(0, 5).join("\n  ")}`);
console.log(process.exitCode ? "E2E FAILED" : `OK booked ${code}`);
await browser.close();
