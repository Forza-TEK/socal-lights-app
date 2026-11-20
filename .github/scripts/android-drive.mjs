// Drives the app's WebView inside the emulator over the Chrome DevTools socket and saves a native screenshot after every step.
// Usage: node android-drive.mjs <output dir>   (the app must already be open; the DevTools port is forwarded to localhost:9222 by android-screens.sh)
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const OUT = process.argv[2], log = [];
const shot = (n) => { try { execSync(`adb exec-out screencap -p > "${OUT}/${n}.png"`, { shell: "/bin/bash" }); } catch (e) { log.push(`shot ${n}: ${e.message}`); } };
const browser = await chromium.connectOverCDP("http://localhost:9222");
const page = browser.contexts()[0].pages()[0];
page.on("pageerror", (e) => log.push("PAGE ERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") log.push("CONSOLE ERROR: " + m.text().slice(0, 200)); });
const step = async (name, fn) => { try { await fn(); await page.waitForTimeout(2500); log.push("ok   " + name); } catch (e) { log.push("FAIL " + name + ": " + String(e.message).split("\n")[0]); } shot("d-" + name); };
await step("01-no-welcome", async () => { await page.click('[data-welcome="no"]', { timeout: 8000 }); });
await step("02-event-card", async () => { await page.click(".item.ev", { timeout: 8000 }); });
await step("03-close-card", async () => { await page.keyboard.press("Escape"); });
await step("04-favorites-tab", async () => { await page.click('#bnav [data-tab="plan"]', { timeout: 8000 }); });
await step("05-places-tab", async () => { await page.click('#bnav [data-tab="events"]', { timeout: 8000 }); });
await step("06-account-button", async () => { await page.click("#acctbtn", { timeout: 8000 }); });
await step("07-add-page", async () => { await page.goto(page.url().replace(/\/[^/]*$/, "") + "/add"); });
await step("08-pricing-page", async () => { await page.goto(new URL("/pricing", page.url()).href); });
await step("09-help-page", async () => { await page.goto(new URL("/help", page.url()).href); });
writeFileSync(`${OUT}/drive-log.txt`, log.join("\n") + "\n");
console.log(log.join("\n"));
await browser.close();
