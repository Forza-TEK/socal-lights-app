// Apple 1.2 (user-generated content) and the open image resizer (audit 2026-11-16, M5 and H4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { onRequestPost as report, REASONS } from "../functions/api/report.js";
import { shareImage } from "../functions/_lib/eventld.js";
import { newEnv } from "./_pay.mjs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const send = (env, body, ip = "203.0.113.7") => report({ request: new Request("https://socallights.app/api/report", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), env });
const rows = (raw) => raw.prepare("SELECT ref, name, message FROM reports ORDER BY rowid").all().map((r) => ({ ...r }));

test("the Report dialog posts to the existing /api/report with a reason, and 'objectionable' is filed first in the message", async () => {
  const { env, raw } = newEnv();
  let r = await send(env, { ref: "h-abc", name: "A home", reason: "objectionable", message: "", contact: "" });
  assert.equal(r.status, 200);
  assert.deepEqual(rows(raw), [{ ref: "h-abc", name: "A home", message: "[Objectionable content] (no details)" }], "a reason alone is enough: one tap");
  r = await send(env, { ref: "e-1", name: "Tree", reason: "wrong", message: "The date changed" });
  assert.equal(r.status, 200); assert.equal(rows(raw)[1].message, "[Wrong information] The date changed");
  assert.deepEqual(Object.keys(REASONS), ["objectionable", "fake", "wrong", "other"]);
  // old callers (no reason) still need a few words
  assert.equal((await send(env, { ref: "e-1", name: "Tree", message: "x" })).status, 400);
  assert.equal((await send(env, { ref: "e-1", name: "Tree", message: "The pin is wrong" })).status, 200);
  // an unknown reason is ignored, not stored
  assert.equal((await send(env, { ref: "e-2", name: "T", reason: "<script>", message: "x" })).status, 400);
});

test("report abuse controls: five an hour per connection, and the same words about the same item twice in a day are not stored twice", async () => {
  const { env, raw } = newEnv();
  assert.equal((await send(env, { ref: "h-1", name: "X", reason: "objectionable" }, "198.51.100.1")).status, 200);
  assert.equal((await send(env, { ref: "h-1", name: "X", reason: "objectionable" }, "198.51.100.2")).status, 200, "answers ok");
  assert.equal(rows(raw).length, 1, "but is stored once");
  for (let i = 0; i < 4; i++) assert.equal((await send(env, { ref: "h-" + (i + 10), name: "X", reason: "fake" }, "198.51.100.1")).status, 200);
  assert.equal((await send(env, { ref: "h-99", name: "X", reason: "fake" }, "198.51.100.1")).status, 429, "the sixth report in an hour from one connection");
  assert.equal(rows(raw).length, 5);
  assert.equal((await send(env, null)).status, 400);
});

test("the map app has Report and Hide for me, remembers hidden items on the device, and can bring them back", () => {
  const app = read("public/app.js");
  assert.match(app, /Report or hide this listing<\/a>/);
  for (const v of ["objectionable", "fake", "wrong", "other"]) assert.match(app, new RegExp(`name="why" value="${v}"`));
  assert.match(app, /reason: f\.why\.value/);
  assert.match(app, /class="rpthide"[^>]*>Hide for me/);
  assert.match(app, /localStorage\.setItem\("socal-hidden"/);
  assert.equal((app.match(/keepShown\(/g) || []).length >= 6, true, "every place the lists are loaded or refreshed drops hidden items");
  assert.match(app, /data-m="unhide"/); assert.match(app, /Show hidden items/);
  assert.match(app, /We review reports of objectionable content within 24 hours/);
});

// ---- the image resizer (owner decision 2026-11-16: "Resize from any origin" stays on, so other sites' photos go through /cdn-cgi/image as before the audit)
test("third-party photos are resized again in the map: remote probe, thumbOf and the fallback to the original", () => {
  const app = read("public/app.js");
  assert.match(app, /let THUMBS = true, THUMBS_REMOTE = true;/);
  assert.match(app, /function probeRemoteThumbs\(\)/); assert.match(app, /setTimeout\(probeRemoteThumbs, 1500\)/);
  assert.match(app, /\(THUMBS_REMOTE && \/\^https\?:\\\/\\\/\/\.test\(u\)\)/);
  assert.match(app, /data-orig/, "a failed resized copy falls back to the original photo");
  assert.ok(!/imgurl\.js/.test(app) && !/imgurl\.js/.test(read("public/index.html")), "no host restriction module any more");
});
test("the share picture is the resized third-party photo again, and the site card only when there is no photo", () => {
  assert.equal(shareImage({ img: "https://www.gstatic.com/webp/gallery/1.jpg" }, "https://socallights.app").url, "https://socallights.app/cdn-cgi/image/width=1200,height=630,fit=cover,quality=70,format=jpeg/https://www.gstatic.com/webp/gallery/1.jpg");
  assert.equal(shareImage({ img: "" }, "https://socallights.app"), null);
  assert.equal(shareImage({ img: "https://socallights.app/api/photo/p/9" }, "https://socallights.app").w, 1200);
});
test("event, city and contest pages use the resizer for any https photo, with the original as the onerror fallback", () => {
  const ev = read("functions/e/[id].js"), city = read("functions/in/[city].js"), c = read("functions/c/[slug].js");
  assert.match(ev, /\/cdn-cgi\/image\/width=960,quality=75,format=auto\/\$\{img\}/); assert.match(ev, /\/cdn-cgi\/image\/width=240,fit=cover\//);
  assert.match(city, /\/cdn-cgi\/image\/width=240,fit=cover\/\$\{esc\(u\)\}/); assert.match(city, /onerror="this\.onerror=null;this\.src='\$\{full\}'"/);
  assert.match(c, /cdn-cgi\/image\/width=1200,height=630/);
  for (const f of [ev, city, c]) assert.ok(!/imgurl/.test(f));
});
