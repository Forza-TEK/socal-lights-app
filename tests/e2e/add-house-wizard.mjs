import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const BASE = process.env.BASE || "http://localhost:8788", OUT = process.env.OUT || "/tmp/scl-shots"; // LOCAL dev server only: these scripts sign in and submit
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "light", storageState: OUT + "/state.json" });
const page = await ctx.newPage();
const logs = []; page.on("console", (m) => { if (["error"].includes(m.type()) && !/Failed to load resource/.test(m.text())) logs.push(m.type() + ": " + m.text()); }); page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
const out = {};
const jpeg = async (n) => Buffer.from((await page.evaluate((n) => { const c = document.createElement("canvas"); c.width = 1200; c.height = 800; const g = c.getContext("2d"); g.fillStyle = n % 2 ? "#c42f39" : "#2a6"; g.fillRect(0, 0, 1200, 800); g.fillStyle = "#fff"; g.font = "80px sans-serif"; g.fillText("Photo " + n, 100, 400); return c.toDataURL("image/jpeg", 0.9).split(",")[1]; }, n)), "base64");
const focusInfo = () => page.evaluate(() => ({ id: document.activeElement.id, invalid: document.activeElement.getAttribute("aria-invalid"), desc: document.activeElement.getAttribute("aria-describedby") }));
const next = async () => { await page.click("#nextbtn"); await page.waitForTimeout(250); };
await page.goto(BASE + "/add-house"); await page.waitForSelector("h1");
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.goto(BASE + "/add-house"); await page.waitForSelector("h1");
await page.click('[data-tile="kind|homeowner"]'); await next();
// name step: empty -> focus on the field, flagged and tied to the message
await next(); out.nameErr = await page.textContent("#err"); out.nameFocus = await focusInfo();
await page.fill("#f-biz", "The Test family"); await next();
await next(); // installer step
await next(); // season
// about: too short title
await page.fill("#f-title", "ab"); await page.fill("#f-desc", "Too short"); await next(); out.titleErr = await page.textContent("#err"); out.titleFocus = await focusInfo();
await page.fill("#f-title", "Playwright Lights"); await page.fill("#f-desc", "Ten thousand lights synced to music every night."); await next();
// address: bad zip -> zip field focus
await page.selectOption("#f-city", "Pasadena"); await page.fill("#f-street", "123 Maple St"); await page.fill("#f-zip", "9110"); await next(); out.zipErr = await page.textContent("#err"); out.zipFocus = await focusInfo();
await page.fill("#f-zip", "91101"); await next();
await next(); // where
out.photosStepHelp = await page.textContent(".help");
await page.setInputFiles("#f-photos", [{ name: "a.jpg", mimeType: "image/jpeg", buffer: await jpeg(1) }, { name: "b.jpg", mimeType: "image/jpeg", buffer: await jpeg(2) }]);
await page.waitForFunction(() => document.querySelectorAll("#thumbs .t").length === 2); out.thumbsBefore = await page.locator("#thumbs .t").count();
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + "/photos-step.png" });
// reload: photos and the step survive; the saved-draft note shows
await page.reload(); await page.waitForSelector("#thumbs");
out.thumbsAfterReload = await page.locator("#thumbs .t").count(); out.draftNote = await page.textContent("#draftnote").catch(() => null); out.stepAfterReload = await page.textContent("h1");
// review: real thumbnails and count, remove one
await next(); out.reviewH1 = await page.textContent("h1"); out.reviewPhotos = await page.locator(".sum-photos .thumbs .t").count(); out.reviewPhotoText = await page.textContent(".sum-photos b");
await page.screenshot({ path: OUT + "/review.png" });
await page.click('.sum-photos [data-rm="0"]'); await page.waitForTimeout(300); out.reviewAfterRemove = await page.locator(".sum-photos .thumbs .t").count(); out.reviewTextAfterRemove = await page.textContent(".sum-photos b");
// keys: draft is under the account's key, no legacy key
out.keys = await page.evaluate(() => Object.keys(localStorage));
// Save & exit -> profile -> Continue brings the photo back
await page.click('[data-a="saveexit"]'); await page.waitForURL(/\/profile/); await page.waitForSelector(".rowi"); out.profileTabAfterSaveExit = await page.textContent(".sechead h2");
out.draftRow = (await page.textContent(".rowi")).replace(/\s+/g, " ");
await page.click('.rowi a.btn'); await page.waitForSelector("h1"); await page.waitForTimeout(600);
out.continueStep = await page.textContent("h1"); out.continuePhotos = await page.locator(".sum-photos .thumbs .t").count(); out.continueNote = await page.textContent("#draftnote").catch(() => null);
// offline submit: friendly message and Try again
await ctx.setOffline(true); await page.click("#nextbtn"); await page.waitForTimeout(600);
out.offlineErr = await page.textContent("#err"); out.retryVisible = await page.isVisible("#retrybtn"); out.btnAfterOffline = await page.textContent("#nextbtn");
await page.screenshot({ path: OUT + "/offline.png" });
await ctx.setOffline(false);
// 429 limit: the message says which and when, plus the email address
await page.route("**/api/submit", (r) => r.fulfill({ status: 429, contentType: "application/json", headers: { "retry-after": "1200" }, body: JSON.stringify({ error: "This network (shared Wi-Fi counts as one connection) has sent 30 submissions in the last hour, which is its limit. It resets in about 20 minutes. Your answers are saved here, so try again then, or email info@socallights.app and we will add it for you.", limit: "connection", retry_after: 1200 }) }));
await page.click("#retrybtn"); await page.waitForTimeout(600);
out.limitErr = await page.textContent("#err"); out.limitHelp = (await page.textContent("#errhelp")).trim(); out.limitRetryHidden = !(await page.isVisible("#retrybtn"));
await page.screenshot({ path: OUT + "/limit.png" });
await page.unroute("**/api/submit");
await page.click("#nextbtn"); await page.waitForSelector(".list", { timeout: 20000 }); await page.waitForTimeout(500);
out.doneH1 = await page.textContent("h1"); out.doneText = (await page.textContent("main")).replace(/\s+/g, " ").slice(0, 700);
await page.screenshot({ path: OUT + "/done.png", fullPage: true });
out.keysAfterSubmit = await page.evaluate(() => Object.keys(localStorage));
out.idb = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open("scl-drafts"); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains("photos")) return res("no store"); const q = db.transaction("photos").objectStore("photos").getAllKeys(); q.onsuccess = () => res(q.result); }; r.onerror = () => res("err"); }));
console.log(JSON.stringify(out, null, 1)); console.log(logs.join("\n"));
await ctx.storageState({ path: OUT + "/state.json" });
await browser.close();
