// Admin audit fixes (2026-11-16 audit 2): phone Actions cell, queue badges and dashboard tiles, two-step Grok and claim actions, sidebar scroll cue.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv } from "./_pay.mjs";
import { onRequestGet as counts } from "../functions/api/admin/counts.js";
import { onRequestGet as dashboard } from "../functions/api/admin/dashboard.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("H1: the phone card layout hides no cell by position (every value keeps its label); the Actions cell stays visible", () => {
  const css = read("public/admin/admin.css");
  assert.doesNotMatch(css, /td:nth-child\(6\)[^{]*\{display:none\}/, "no column is dropped on a phone");
  assert.match(css, /td\[data-label\]::before\{content:attr\(data-label\)/, "cells print their column name");
  assert.match(read("public/admin/admin.js"), /function labelTables\(/, "every table gets its labels from its header row");
  // every table that has an Actions header marks the cell class "ac" in its rows
  for (const f of ["admin", "grok", "partner"]) {
    const js = read(`public/admin/${f}.js`);
    assert.ok(!/<th class="ac">Actions<\/th>/.test(js) || /<td class="ac">/.test(js), f + " rows mark the actions cell");
  }
});

test("L3: phone cards label the photo count, received and contact cells", () => {
  const js = read("public/admin/admin.js"), css = read("public/admin/admin.css");
  for (const l of ["Photos", "Received", "Contact", "Added"]) assert.match(js, new RegExp(`data-label="${l}"`));
  assert.match(css, /td\[data-label\]::before\{content:attr\(data-label\)/);
});

test("L1: the side menu shows a scroll shadow", () => assert.match(read("public/admin/admin.css"), /\.nvlist\{[^}]*background-attachment:local,local,scroll,scroll/));

const seed = (raw) => {
  raw.exec(`INSERT INTO intake_events (id,status,name,city,start_date,end_date) VALUES ('grok-a','held','A','Irvine','2026-12-01','2026-12-02'),('grok-b','rejected','B','Irvine','2026-12-01','2026-12-02'),('grok-c','published','C','Irvine','2026-12-01','2026-12-02')`);
  raw.exec(`INSERT INTO intake_updates (id,event_id,event_name,status,kind) VALUES ('gu-1','x','X','held','change'),('gu-2','x','X','applied','change')`);
  raw.exec(`INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('c1','e1','u1','a@b.co','pending'),('c2','e2','u1','a@b.co','approved')`);
};

test("H3: counts include held Grok rows and updates, and pending event claims", async () => {
  const { env, raw } = newEnv(); seed(raw);
  const c = await (await counts({ env })).json();
  assert.equal(c.grok, 2); assert.equal(c.claims, 1);
});

test("H3: the dashboard attention block counts Grok items and event claims, and the page lists them", async () => {
  const { env, raw } = newEnv(); seed(raw);
  const d = await (await dashboard({ env })).json();
  assert.equal(d.attention.grokHeld, 2); assert.equal(d.attention.eventClaims, 1);
  const js = read("public/admin/admin.js");
  assert.match(js, /\["claims", a\.eventClaims, "event claim"/); assert.match(js, /\["grok", a\.grokHeld, "Grok item"/);
  assert.match(js, /COUNTS\.grok/); assert.match(read("public/admin/index.html"), /data-count="grok" data-hide0="1"/);
});

test("L2: the installer tile is named for what it counts", () => assert.match(read("public/admin/admin.js"), /"installer claim", "on a home, to confirm"/));

test("M6: Grok Unpublish, Undo, Remove photo and Publish anyway need a second tap; claim Approve and Decline too", () => {
  const g = read("public/admin/grok.js"), a = read("public/admin/admin.js");
  assert.match(g, /import \{[^}]*\btap\b[^}]*\} from "\/admin\/kit\.js/);
  assert.match(g, /g === "unpublish" \|\| g === "update_revert" \|\| g === "remove_photo" \|\| g === "update_remove" \|\| \(g === "publish" && rej\)\) && !tap\(b/);
  assert.match(a, /if \(!tap\(b, b\.dataset\.clact\)\) return;/);
});

test("M8: the Events menu count says it covers all seasons, and the page count says so too", () => {
  assert.match(read("public/admin/index.html"), /data-count="events" title="Events on the map in all seasons"/);
  assert.match(read("public/admin/admin.js"), /in this season \(menu count: all seasons\)/);
});

test("L5: cron endpoints compare the shared key in constant time; an Access token without exp is refused", async () => {
  const { sameKey } = await import("../functions/_lib/util.js");
  assert.equal(sameKey("abcdefghijklmnop", "abcdefghijklmnop"), true);
  assert.equal(sameKey("abcdefghijklmnop", "abcdefghijklmnoq"), false);
  assert.equal(sameKey("abc", "abcdefghijklmnop"), false);
  assert.equal(sameKey("", ""), true); assert.equal(sameKey(undefined, "x"), false);
  for (const f of ["admin-digest", "alerts/send", "contest-remind", "deploy-check", "heartbeat", "mail/drain", "placement-notices", "sponsor/renewals", "stripe-reconcile", "usage-check", "verify-events"]) {
    const js = read(`functions/api/${f}.js`);
    assert.match(js, /!sameKey\(key, env\.ALERT_CRON_KEY\)/, f); assert.doesNotMatch(js, /key !== env\.ALERT_CRON_KEY/, f);
  }
  assert.match(read("functions/_lib/util.js"), /if \(!payload\.exp \|\| payload\.exp \* 1000 < Date\.now\(\)\) return null/);
});
