// Page counter: event and past pages share one key each, and the daily page-name cap counts page names only.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as visit, group, CLICK_KEYS } from "../functions/api/visit.js";
import { dayKey } from "../functions/_lib/funnel.js";
import { newEnv } from "./_pay.mjs";

const post = (env, body) => visit({ request: new Request("https://x.test/api/visit", { method: "POST", body: JSON.stringify(body) }), env });
const n = (raw, page) => (raw.prepare("SELECT n FROM site_hits WHERE day = ? AND page = ?").get(dayKey(), page) || {}).n || 0;

test("group(): event and past pages are one bucket each; other groups unchanged", () => {
  assert.equal(group("/e/alhambra-lny"), "event"); assert.equal(group("/e/other-id?ref=fb"), "event");
  assert.equal(group("/past/foo"), "past");
  assert.equal(group("/"), "map"); assert.equal(group("/in/irvine"), "city"); assert.equal(group("/c/abc/manage"), "contest-manage");
  assert.equal(group("/installer/x"), "installer"); assert.equal(group("/help/a"), "help"); assert.equal(group("/pricing"), "pricing");
  assert.equal(group("/admin/x"), ""); assert.equal(group("/api/x"), "");
});

test("many different event pages make two rows at most, and a new page name is still counted afterwards", async () => {
  const { env, raw } = newEnv();
  for (let i = 0; i < 120; i++) await post(env, { p: "/e/event-" + i });
  for (let i = 0; i < 30; i++) await post(env, { p: "/past/p-" + i });
  assert.equal(n(raw, "event"), 120); assert.equal(n(raw, "past"), 30);
  assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM site_hits WHERE day = ?").get(dayKey()).c, 2);
  await post(env, { p: "/sponsor" }); await post(env, { p: "/feature" });
  assert.equal(n(raw, "sponsor"), 1); assert.equal(n(raw, "feature"), 1);
});

test("fn:, click: and ref: rows do not use up the page-name cap; the cap still stops a flood of made-up names", async () => {
  const { env, raw } = newEnv();
  for (const k of CLICK_KEYS) await post(env, { k });
  for (const k of ["fn:visit", "fn:event-open", "fn:signin-open"]) await post(env, { k });
  for (let i = 0; i < 100; i++) await post(env, { p: "/made-up-" + i });
  const pages = raw.prepare("SELECT COUNT(*) AS c FROM site_hits WHERE day = ? AND page NOT LIKE 'fn:%' AND page NOT LIKE 'click:%' AND page NOT LIKE 'ref:%'").get(dayKey()).c;
  assert.equal(pages, 80, "80 page names, no more");
  await post(env, { p: "/made-up-3" }); assert.equal(n(raw, "made-up-3"), 2, "a name already counted keeps counting");
  assert.equal(n(raw, "click:ticket"), 1); // the other counters are untouched
});

test("with the daily caps reached by other keys, a new page name is still accepted", async () => {
  const { env, raw } = newEnv();
  for (let i = 0; i < 79; i++) raw.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1)").run(dayKey(), "fn:filler-" + i);
  await post(env, { p: "/brand-new" }); assert.equal(n(raw, "brand-new"), 1);
});
