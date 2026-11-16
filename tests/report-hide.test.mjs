// Apple 1.2 (user-generated content) and the open image resizer (audit 2026-11-16, M5 and H4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { onRequestPost as report, REASONS } from "../functions/api/report.js";
import { ownImageUrl, resizedImage } from "../public/imgurl.js";
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

// ---- the image resizer
test("only our own images go through /cdn-cgi/image; another site's photo is returned as '' so the caller uses the original", () => {
  assert.equal(resizedImage("/img/events/a.webp", "width=240", "https://socallights.app"), "/cdn-cgi/image/width=240/https://socallights.app/img/events/a.webp");
  assert.equal(resizedImage("https://socallights.app/api/photo/p/1", "width=240,fit=cover"), "/cdn-cgi/image/width=240,fit=cover/https://socallights.app/api/photo/p/1");
  assert.equal(resizedImage("https://www.socallights.app/x.jpg", "width=240"), "/cdn-cgi/image/width=240/https://www.socallights.app/x.jpg");
  for (const bad of ["https://www.gstatic.com/webp/gallery/1.jpg", "http://evil.example/x.png", "https://socallights.app.evil.example/x.png", "https://evil.example/https://socallights.app/x.png", "//evil.example/x.png", "https://user:pw@socallights.app/x.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "", null, undefined]) assert.equal(resizedImage(bad, "width=240"), "", String(bad));
  assert.equal(resizedImage("/img/a.webp", "width=240/../../x"), "", "options cannot smuggle a path");
  assert.equal(ownImageUrl("/a.png", "https://socal-lights.pages.dev"), "https://socal-lights.pages.dev/a.png", "the page's own origin counts (pages.dev previews)");
  assert.equal(ownImageUrl("https://evil.example/a.png", "https://socal-lights.pages.dev"), "");
});
test("the share picture is made only from our own photos; a third-party photo falls back to the site card", () => {
  assert.equal(shareImage({ img: "https://www.gstatic.com/webp/gallery/1.jpg" }, "https://socallights.app"), null);
  assert.equal(shareImage({ img: "" }, "https://socallights.app"), null);
  const s = shareImage({ img: "https://socallights.app/api/photo/p/9" }, "https://socallights.app");
  assert.equal(s.url, "https://socallights.app/cdn-cgi/image/width=1200,height=630,fit=cover,quality=70,format=jpeg/https://socallights.app/api/photo/p/9");
});
test("no page or Function builds a /cdn-cgi/image address by hand: they all use public/imgurl.js (the probe is a fixed own image)", () => {
  const walk = (d, out = []) => { for (const f of readdirSync(d)) { if (["vendor", "tutorials", "img", "node_modules"].includes(f)) continue; const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(js|html)$/.test(f)) out.push(p); } return out; };
  const root = new URL("..", import.meta.url).pathname, bad = [];
  for (const f of [...walk(join(root, "public")), ...walk(join(root, "functions"))]) {
    if (f.endsWith("public/imgurl.js")) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) { const m = line.match(/`[^`]*\/cdn-cgi\/image\/[^`]*`|"[^"]*\/cdn-cgi\/image\/[^"]*"/g); if (m) for (const x of m) if (!/width=16\//.test(x)) bad.push(f.replace(root, "") + ": " + x.slice(0, 80)); }
  }
  assert.deepEqual(bad, []);
  const app = read("public/app.js"); assert.ok(!/THUMBS_REMOTE|probeRemoteThumbs/.test(app), "the remote-photo resizing test is gone");
  assert.match(read("public/index.html"), /modulepreload" href="\/imgurl\.js\?v=/);
});
