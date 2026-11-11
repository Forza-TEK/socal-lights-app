import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:8788", OUT = process.env.OUT || "/tmp/scl-shots"; // LOCAL dev server only: these scripts sign in and submit
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "dark", storageState: OUT + "/state.json" });
const page = await ctx.newPage();
const logs = []; page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) logs.push(m.text()); }); page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
const out = {};
const jpeg = async (n) => Buffer.from(await page.evaluate((n) => { const c = document.createElement("canvas"); c.width = 900; c.height = 600; const g = c.getContext("2d"); g.fillStyle = "#36c"; g.fillRect(0, 0, 900, 600); return c.toDataURL("image/jpeg", 0.9).split(",")[1]; }, n), "base64");
await page.goto(BASE + "/profile"); await page.waitForSelector(".rowi");
out.tab = await page.textContent(".sechead h2"); out.row = (await page.textContent(".rowi")).replace(/\s+/g, " ").slice(0, 120);
await page.click("[data-medit]"); await page.waitForSelector(".fwin form [data-ephotos]", { state: "attached" });
out.sections = await page.$$eval(".fwin legend", (l) => l.map((x) => x.textContent));
await page.setInputFiles(".fwin [data-ephotos]", [{ name: "a.jpg", mimeType: "image/jpeg", buffer: await jpeg(1) }, { name: "b.jpg", mimeType: "image/jpeg", buffer: await jpeg(2) }]);
await page.waitForFunction(() => document.querySelectorAll(".fwin .thumbs .t").length === 3); out.photos = await page.locator(".fwin .thumbs .t").count();
await page.click(".fwin [data-ph-cover]"); await page.waitForTimeout(400); out.statCover = await page.textContent(".fwin [data-pstat]");
await page.click('.fwin [data-ph-rm]'); await page.waitForTimeout(400); out.afterRm = await page.locator(".fwin .thumbs .t").count();
await page.selectOption('.fwin [data-k="season"]', "halloween");
await page.fill('.fwin [data-k="street"]', "500 Colorado Blvd");
await page.screenshot({ path: OUT + "/edit-sheet.png" });
await page.click('.fwin button[type="submit"]'); await page.waitForTimeout(2500);
out.toast = await page.textContent("#toast").catch(() => null);
// overview reflects changes
out.api = await page.evaluate(async () => { const o = await (await fetch("/api/me/overview")).json(); const h = o.homes[0]; return { season: h.season, street: h.street, photos: h.photos.length, status: h.status }; });
// spam text goes back to review
await page.click("[data-medit]"); await page.fill('.fwin [data-k="desc"]', "Best casino bonus lights for everyone tonight"); await page.click('.fwin button[type="submit"]'); await page.waitForTimeout(1500);
out.reviewToast = await page.textContent("#toast").catch(() => null);
out.api2 = await page.evaluate(async () => { const o = await (await fetch("/api/me/overview")).json(); return o.homes[0].status; });
// delete with undo (home now in review has no delete button; use a draft instead)
await page.goto(BASE + "/add-event"); await page.waitForSelector("h1");
await page.fill("#f-url", "").catch(() => {});
await page.click('[data-a="skipurl"]'); await page.waitForTimeout(300);
await page.fill("#f-name", "Playwright Winter Walk"); await page.selectOption("#f-type", { index: 1 }); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.fill("#f-start", "2026-12-20"); await page.fill("#f-end", "2026-12-21"); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.fill("#f-venue", "Heritage Park"); await page.selectOption("#f-city", "Pasadena"); await page.fill("#f-street", "300 Main Street"); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.fill("#f-blurb", "Walk the lit streets with cocoa and carols for all."); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.click("#nextbtn"); await page.waitForSelector(".list", { timeout: 20000 });
out.eventDone = (await page.textContent("main")).replace(/\s+/g, " ").slice(0, 500);
await page.screenshot({ path: OUT + "/event-done.png", fullPage: true });
// duplicate: same again
await page.goto(BASE + "/add-event"); await page.waitForSelector("h1"); await page.evaluate(() => localStorage.clear()); await page.goto(BASE + "/add-event"); await page.waitForSelector("h1");
await page.click('[data-a="skipurl"]'); await page.waitForTimeout(300);
await page.fill("#f-name", "Playwright Winter Walk"); await page.selectOption("#f-type", { index: 1 }); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.fill("#f-start", "2026-12-20"); await page.fill("#f-end", "2026-12-21"); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.fill("#f-venue", "Heritage Park"); await page.selectOption("#f-city", "Pasadena"); await page.fill("#f-street", "300 Main Street"); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.fill("#f-blurb", "Walk the lit streets with cocoa and carols for all."); await page.click("#nextbtn"); await page.waitForTimeout(250);
await page.click("#nextbtn"); await page.waitForSelector(".btn", { timeout: 20000 }); await page.waitForTimeout(500);
out.dupDone = (await page.textContent("main")).replace(/\s+/g, " ").slice(0, 400);
// profile events tab: edit sheet has address/season; delete with undo
await page.goto(BASE + "/profile#events"); await page.waitForSelector(".rowi");
await page.click("[data-medit]"); out.evSections = await page.$$eval(".fwin legend", (l) => l.map((x) => x.textContent)); await page.click(".fwin .xbtn");
await page.click("[data-edel]"); out.delNote = await page.textContent(".delnote"); out.delBtn = await page.textContent("[data-edel]");
await page.click("[data-edel]"); await page.waitForTimeout(300); out.undoBar = await page.textContent(".undobar");
await page.screenshot({ path: OUT + "/undo.png" });
await page.click(".undobar .link"); await page.waitForTimeout(300); out.rowBack = await page.isVisible("[data-medit]");
out.evCount = await page.evaluate(async () => (await (await fetch("/api/me/overview")).json()).events.length);
await page.click("[data-edel]"); await page.click("[data-edel]"); await page.waitForTimeout(9500);
out.evCountAfter = await page.evaluate(async () => (await (await fetch("/api/me/overview")).json()).events.length);
// sign out clears drafts
await page.evaluate(() => localStorage.setItem("scl-event-draft:x", "{}"));
await page.goto(BASE + "/profile#account"); await page.waitForSelector("#so"); await page.click("#so"); await page.waitForURL(BASE + "/");
out.keysAfterSignOut = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("scl-") && /draft/.test(k)));
console.log(JSON.stringify(out, null, 1)); console.log(logs.join("\n"));
await browser.close();
