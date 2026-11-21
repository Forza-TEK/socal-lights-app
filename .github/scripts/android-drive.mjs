// Drives the app's WebView inside the emulator over the plain Chrome DevTools protocol (Playwright cannot attach to Android WebView: it needs browser contexts)
// and saves a native screenshot after every step. Usage: node android-drive.mjs <output dir>; android-screens.sh forwards the DevTools socket to localhost:9222.
import WebSocket from "ws";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const OUT = process.argv[2], log = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => { try { execSync(`adb exec-out screencap -p > "${OUT}/${n}.png"`, { shell: "/bin/bash" }); } catch (e) { log.push(`shot ${n}: ${e.message}`); } };

const targets = await (await fetch("http://localhost:9222/json")).json();
const t = targets.find((x) => x.type === "page" && /10\.0\.2\.2|localhost/.test(x.url)) || targets.find((x) => x.type === "page");
if (!t) throw new Error("no page target: " + JSON.stringify(targets).slice(0, 300));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
let id = 0; const waiting = new Map();
ws.on("message", (d) => {
  const m = JSON.parse(d);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  else if (m.method === "Runtime.exceptionThrown") log.push("PAGE ERROR: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") log.push("CONSOLE ERROR: " + m.params.args.map((a) => a.value || a.description || "").join(" ").slice(0, 200));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (waiting.delete(i)) res({ timeout: true }); }, 8000); }); // a click that navigates destroys the page context and never answers
const evalJs = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.timeout) return "TIMEOUT"; if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
await send("Runtime.enable"); await send("Page.enable");
const click = async (sel, ms = 8000) => { const end = Date.now() + ms; for (;;) { if (await evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`)) { await sleep(1500); return; } if (Date.now() > end) throw new Error("not found: " + sel); await sleep(500); } };
const go = async (path) => { await send("Page.navigate", { url: new URL(path, await evalJs("location.href")).href }); await sleep(4000); };
const step = async (name, fn) => { try { await fn(); await sleep(2500); log.push("ok   " + name); } catch (e) { log.push("FAIL " + name + ": " + String(e.message).split("\n")[0]); } shot("d-" + name); };

await step("01-no-welcome", () => click('[data-welcome="no"]'));
await step("02-event-card", () => click(".item.ev"));
await step("03-close-card", () => evalJs(`document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))`));
await step("04-favorites-tab", () => click('#bnav [data-tab="plan"]'));
await step("05-places-tab", () => click('#bnav [data-tab="events"]'));
await step("06-account-button", () => click("#acctbtn"));
await step("07-add-page", () => go("/add"));
await step("08-pricing-page", () => go("/pricing"));
await step("09-help-page", () => go("/help"));
writeFileSync(`${OUT}/drive-log.txt`, log.join("\n") + "\n");
console.log(log.join("\n"));
ws.close();
