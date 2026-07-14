// Browser journeys: member (phone), coach (tablet), owner (desktop), kiosk.
// Run: node apps/web/tests/browser/journeys.mjs  (expects the app on :3000, seeded)
import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOT_DIR ?? "test-results";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function ok(name, cond) {
  results.push([name, !!cond]);
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) process.exitCode = 1;
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button:has-text("Sign in")');
  await page.waitForLoadState("networkidle");
}

const browser = await chromium.launch({ executablePath: EXE });

// ============ MEMBER on a phone (390px) ============
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page, "member@ironworks.demo");
  ok("member lands on /home", page.url().includes("/home"));
  ok("commitment ring visible", await page.locator('svg[aria-label*="target"]').count() > 0);
  const promo = page.locator('text=A spot opened up');
  const alreadyBooked = await page.locator("text=06:00").count(); // confirmed on a previous run
  ok("waitlist promotion banner shows (or already confirmed)", (await promo.count()) > 0 || alreadyBooked > 0);
  await page.screenshot({ path: `${SHOTS}/member-home-390.png`, fullPage: true });
  if (await promo.count()) {
    await page.click('button:has-text("Confirm my place")');
    let gone = false;
    for (let i = 0; i < 20 && !gone; i++) { // server action + redirect can take a beat
      await page.waitForTimeout(300);
      gone = (await page.locator("text=A spot opened up").count()) === 0;
    }
    ok("promotion confirmed (banner gone)", gone);
  }
  await page.goto(`${BASE}/timetable`);
  await page.waitForSelector('text=Timetable');
  await page.screenshot({ path: `${SHOTS}/member-timetable-390.png` });
  const bookBtn = page.locator('button:has-text("Book")').first();
  if (await bookBtn.count()) {
    await bookBtn.click();
    await page.waitForLoadState("networkidle");
    ok("booking succeeds from timetable", (await page.locator('text=You\'re in ✓').count()) > 0);
  }
  await page.goto(`${BASE}/checkin`);
  ok("QR check-in renders", await page.locator('svg').count() > 0);
  await page.screenshot({ path: `${SHOTS}/member-qr-390.png` });
  await page.close();
}

// ============ COACH on a tablet (820px) ============
{
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await login(page, "coach@ironworks.demo");
  ok("coach lands on /coach", page.url().includes("/coach"));
  await page.goto(`${BASE}/coach/brief`);
  await page.waitForSelector("text=Coach Brief");
  ok("brief shows chips", await page.locator(".chip").count() > 0);
  await page.screenshot({ path: `${SHOTS}/coach-brief-820.png`, fullPage: true });
  await page.click('a:has-text("Open roster")');
  await page.waitForSelector('button:has-text("Here")');
  await page.locator('button:has-text("Here")').first().click();
  await page.waitForLoadState("networkidle");
  ok("roster attendance marks", await page.locator("button.bg-teal-600").count() > 0);
  await page.screenshot({ path: `${SHOTS}/coach-roster-820.png` });
  await page.goto(`${BASE}/coach/queue`);
  await page.waitForSelector("text=Action queue");
  ok("queue shows evidence lines", await page.locator("text=Why:").count() > 0);
  await page.screenshot({ path: `${SHOTS}/coach-queue-820.png`, fullPage: true });
  await page.locator('a:has-text("✍️ Message")').first().click();
  await page.waitForSelector("textarea");
  const draft = await page.inputValue("textarea");
  ok("message draft prefilled", draft.length > 20);
  await page.click('button:has-text("Approve & send")');
  await page.waitForLoadState("networkidle");
  ok("approve & send returns to queue", page.url().includes("/coach/queue"));
  await page.close();
}

// ============ OWNER on desktop (1280px) ============
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(page, "owner@ironworks.demo");
  ok("owner lands on /owner", page.url().includes("/owner"));
  ok("dashboard metrics render", await page.locator("text=class fill rate").count() > 0);
  await page.screenshot({ path: `${SHOTS}/owner-dashboard-1280.png`, fullPage: true });
  await page.close();
}

// ============ NEW MEMBER joins via invite link (phone) ============
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/j/ironworks?r=member`);
  await page.fill('input[name="name"]', "Test Journey");
  await page.fill('input[name="email"]', `journey-${Date.now()}@t.test`);
  await page.fill('input[name="password"]', "password123");
  await page.check('input[name="consent"]');
  await page.click('button:has-text("Join Ironworks")');
  await page.waitForURL("**/welcome", { timeout: 15000 });
  ok("join -> onboarding", true);
  await page.fill('textarea[name="goals"]', "Test my way to consistency");
  await page.click('button:has-text("Let\'s go")');
  await page.waitForURL("**/home", { timeout: 15000 });
  ok("onboarding -> home with commitment", await page.locator('svg[aria-label*="target 3"]').count() > 0);
  await page.close();
}

// ============ KIOSK on a tablet ============
{
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await page.goto(`${BASE}/kiosk`);
  await page.fill('input[name="slug"]', "ironworks");
  await page.fill('input[name="pin"]', "4321");
  await page.click('button:has-text("Unlock kiosk")');
  await page.waitForSelector("text=check in");
  await page.fill('input[name="q"]', "Priya");
  await page.click('button:has-text("Search")');
  await page.waitForSelector("text=Priya Sharma");
  ok("kiosk finds member", true);
  await page.screenshot({ path: `${SHOTS}/kiosk-820.png` });
  const card = page.locator(".card", { hasText: "Priya Sharma" }).first();
  if (await card.locator("text=Already checked in today").count()) {
    ok("kiosk check-in confirms (already in today)", true);
  } else {
    const btn = card.locator("form button").first(); // their booked class or a class-time button
    await btn.click();
    await page.waitForSelector("text=You're in");
    ok("kiosk check-in confirms", true);
    await page.screenshot({ path: `${SHOTS}/kiosk-done-820.png` });
  }
  await page.close();
}

await browser.close();
const failed = results.filter(([, p]) => !p);
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
