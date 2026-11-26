// 2026-11-16 audit of the creation flows (docs/audit/2026-11-16): the add pages' shared script and wording.
// M5 focus after each step, L3 monthly-update failure, L12 contest pass note, L13 copy, L14 docs. The pages cannot run in node, so these pin the code that does the work.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const flow = read("public/addflow.js");

test("M5: after each step focus lands in the first text box, or on the step's heading when there is none; the finished screen focuses its heading", () => {
  assert.match(flow, /<h1 tabindex="-1" style="outline:none">\$\{esc\(T\(s\.title\)\)\}<\/h1>/, "the heading can take focus");
  assert.match(flow, /if \(f && f\.classList\.contains\("in"\)\) f\.focus\(\{ preventScroll: true \}\); else \{ const h = root\.querySelector\("main h1"\); if \(h\) h\.focus\(\{ preventScroll: true \}\); \}/);
  assert.match(flow, /S\.done !== null\) \{ root\.innerHTML = [^;]*nlNotice\(\)[^;]*; const h = root\.querySelector\("main h1"\); if \(h\) \{ h\.setAttribute\("tabindex", "-1"\); h\.style\.outline = "none"; h\.focus/);
});

test("L3: when the monthly-update choice cannot be saved, the confirmation screen says so and where to turn it on (and says nothing when it worked or was not chosen)", () => {
  assert.match(flow, /if \(!r\.ok\) nlFailed = true; \} catch \{ nlFailed = true; \}/, "a refused call and a dropped connection both count");
  assert.match(flow, /We could not turn on the monthly update\. Your listing was saved\. You can turn the update on from Your profile, Account tab\./);
  assert.match(flow, /const nlNotice = \(\) => \{ const t = nlFailed; nlFailed = false; return t \?/, "shown once, then cleared");
  assert.match(flow, /nlFailed = false;\n  if \(!x\.nl\) return;/, "a person who did not tick the box never sees it");
  for (const f of ["add-house", "add-event", "add-contest"]) assert.match(read(`public/${f}.html`), /await nlSave\(/, f + " still sends the choice after the listing was saved");
});

test("L12: the contest wizard says up front that a pass is needed and what it starts at, on the first step and on Dates; the app shows no price", () => {
  const h = read("public/add-contest.html");
  assert.match(h, /const lowPass = Object\.values\(\(CFG\.contestPasses \|\| \{\}\)\.plans \|\| \{\}\)\.map\(\(p\) => p\.cents\)/, "the lowest price comes from /api/config, never typed here");
  assert.match(h, /const passLine = \(\) => \(IN_APP \? ""/);
  assert.match(h, /aria: "Contest name" \}\) \+ passLine\(\)/); assert.match(h, /Use typical dates<\/button><\/div>\$\{passLine\(\)\}/);
  assert.match(h, /You choose it near the end, before anything is charged/);
  assert.ok(!/\$149|\$199|\$299/.test(h), "no price is written into the page");
});

test("L13: the skip button says what it does, the installer's email note says how it is used, and photo messages name the file", () => {
  const ev = read("public/add-event.html"), ho = read("public/add-house.html");
  assert.match(ev, /No web page, continue/); assert.ok(!/No\.\.\. Next/.test(ev));
  assert.match(ho, /quote requests from families are emailed to it/);
  assert.match(flow, /Skipped \$\{nm\}: it isn't a photo\./); assert.match(flow, /\$\{nm\} couldn't be read\. Try a JPG or PNG\./); assert.match(flow, /can't open \$\{nm\} \(a HEIC photo\)/);
});

test("L14: docs/contests.md describes the live hub, sign-in before step 1, and the silent caps", () => {
  const d = read("docs/contests.md");
  assert.ok(!/Live on `main` but hidden/.test(d)); assert.match(d, /\*\*Live\.\*\* The Add hub/);
  assert.ok(!/Signing in happens on the last screen/.test(d)); assert.match(d, /Signing in happens before the first step/);
  assert.match(d, /at most 8 voting categories and 15 judges/); assert.match(d, /"clone"/);
});

test("the changed script has one new version on every page that loads it (phones keep the old file for 4 hours otherwise)", () => {
  const tags = new Set();
  for (const dir of ["public", "public/admin"]) for (const f of readdirSync(dir).filter((n) => /\.(html|js)$/.test(n))) for (const m of read(`${dir}/${f}`).matchAll(/\/addflow\.js\?v=([0-9a-z]+)/g)) tags.add(m[1]);
  assert.deepEqual([...tags], ["20261126a"]);
});
