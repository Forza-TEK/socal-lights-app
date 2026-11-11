import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:8788", OUT = process.env.OUT || "/tmp/scl-shots"; // LOCAL dev server only: these scripts sign in and submit
import { mkdirSync } from "node:fs"; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "light" });
const page = await ctx.newPage();
const logs = []; page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(m.type() + ": " + m.text()); }); page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
let startReq = 0; page.on("request", (r) => { if (r.url().includes("/api/auth/email/start")) startReq++; });
await page.goto(BASE + "/add-house"); await page.waitForSelector("#gate-in");
await page.click("#gate-in"); await page.waitForSelector("#si-email");
const out = {};
out.focusOnOpen = await page.evaluate(() => document.activeElement && document.activeElement.id);
// empty email: no request, message announced, focus in field
await page.click("#si-send"); await page.waitForTimeout(200);
out.emptyMsg = await page.textContent("#si-err"); out.emptyReq = startReq; out.emptyFocus = await page.evaluate(() => document.activeElement.id); out.emptyDescribed = await page.getAttribute("#si-email", "aria-describedby"); out.errRole = await page.getAttribute("#si-err", "role");
await page.fill("#si-email", "bob@"); await page.click("#si-send"); await page.waitForTimeout(200);
out.badMsg = await page.textContent("#si-err"); out.badReq = startReq;
// focus trap: Tab 25 times, focus must stay in the dialog
let inside = true; for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); if (!(await page.evaluate(() => !!document.activeElement.closest(".dlg")))) inside = false; }
out.trapTab = inside; inside = true; for (let i = 0; i < 25; i++) { await page.keyboard.press("Shift+Tab"); if (!(await page.evaluate(() => !!document.activeElement.closest(".dlg")))) inside = false; }
out.trapShiftTab = inside;
await page.screenshot({ path: OUT + "/signin-error.png" });
// Escape closes and returns focus to the opener
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
out.closed = (await page.locator(".dlg").count()) === 0; out.focusReturned = await page.evaluate(() => document.activeElement.id);
// offline in the sheet
await page.click("#gate-in"); await page.waitForSelector("#si-email"); await page.fill("#si-email", "bob@example.com");
await ctx.setOffline(true); await page.click("#si-send"); await page.waitForTimeout(400);
out.offlineMsg = await page.textContent("#si-err"); await ctx.setOffline(false);
// sign in for real (local dev: the code is handed back on screen)
await page.click("#si-send"); await page.waitForSelector("#si-code"); const hint = await page.textContent(".hint b");
await page.click("#si-verify"); await page.waitForTimeout(150); out.shortCodeMsg = await page.textContent("#si-err");
await page.fill("#si-code", "000000"); await page.click("#si-verify"); await page.waitForTimeout(500); out.wrongCode = await page.textContent("#si-err"); out.wrongCodeFocus = await page.evaluate(() => document.activeElement.id); out.codeCleared = await page.inputValue("#si-code");
await page.fill("#si-code", hint); await page.click("#si-verify");
await page.waitForSelector(".main h1", { timeout: 15000 }); await page.waitForTimeout(800);
out.afterSignIn = await page.textContent("h1");
console.log(JSON.stringify(out, null, 1)); console.log(logs.join("\n"));
await ctx.storageState({ path: OUT + "/state.json" });
await browser.close();
