// /api/verify-events: the automatic re-check that confirms people's own events once their event page passes (called by the Cloudflare cron Worker every 30 minutes).
import test from "node:test";
import assert from "node:assert/strict";
import { onRequest as verify } from "../functions/api/verify-events.js";
import { newEnv, stubFetch, ptToday } from "./_pay.mjs";

const KEY = "k".repeat(24);
const call = (env, method = "POST", key = KEY) => verify({ request: new Request("https://x.test/api/verify-events", { method, headers: { "x-alert-key": key } }), env: { ...env, ALERT_CRON_KEY: KEY } });
const end = ptToday(20), start = ptToday(10), year = start.slice(0, 4);

function seed(raw, id, { name = "Night in Bethlehem", url = "https://church.test/" + id, status = "expected", sub = "published", user = true, endDate = end } = {}) {
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, name, "Riverside", "Murrieta", "show", start, endDate, status, 1, "Free", "6pm–7:30pm", 33.5, -117.1, "", url, "christmas", "", "");
  if (user) raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run("s-" + id, sub, name, "Riverside", "Murrieta", "christmas", "show", start, endDate, 1, "Free", "", 33.5, -117.1, "", url, "", "", "a@b.test", 0, "event page could not be loaded", id);
}
const st = (raw, id) => raw.prepare("SELECT status FROM events WHERE id = ?").get(id).status;
const sub = (raw, id) => raw.prepare("SELECT verified, note, checked_at FROM event_submissions WHERE id = ?").get("s-" + id);

test("needs the shared key; GET and POST only", async () => {
  const { env } = newEnv();
  assert.equal((await call(env, "POST", "short")).status, 401);
  assert.equal((await call(env, "PUT")).status, 405);
});

test("an expected, user-submitted event whose page now passes becomes confirmed", async () => {
  const { env, raw } = newEnv(); seed(raw, "u-a");
  const s = stubFetch(() => new Response(`<h1>A Night in Bethlehem ${year}</h1> Bethlehem`));
  try { const j = await (await call(env)).json(); assert.deepEqual([j.checked, j.confirmed, j.failed], [1, 1, 0]); } finally { s.restore(); }
  assert.equal(st(raw, "u-a"), "confirmed");
  const r = sub(raw, "u-a"); assert.equal(r.verified, 1); assert.match(r.note, /confirmed automatically/); assert.ok(r.checked_at);
});

test("a page that still fails stays expected, is noted, and is not asked again within 6 hours", async () => {
  const { env, raw } = newEnv(); seed(raw, "u-b");
  const s = stubFetch(() => { throw new Error("reset"); });
  try {
    const a = await (await call(env)).json(); assert.deepEqual([a.checked, a.confirmed, a.failed], [1, 0, 1]);
    const again = await (await call(env)).json(); assert.equal(again.checked, 0, "just checked, so it waits");
  } finally { s.restore(); }
  assert.equal(st(raw, "u-b"), "expected"); assert.match(sub(raw, "u-b").note, /slow or would not answer/);
  raw.prepare("UPDATE event_submissions SET checked_at = datetime('now','-7 hours')").run();
  const s2 = stubFetch(() => new Response(`Night in Bethlehem ${year} Bethlehem`));
  try { assert.equal((await (await call(env)).json()).confirmed, 1, "after 6 hours it is asked again and now passes"); } finally { s2.restore(); }
  assert.equal(st(raw, "u-b"), "confirmed");
});

test("only people's own, live, still-expected, upcoming events with a page are checked", async () => {
  const { env, raw } = newEnv();
  seed(raw, "swept", { user: false }); seed(raw, "done", { status: "confirmed" }); seed(raw, "past", { endDate: ptToday(-3) }); seed(raw, "nopage", { url: "" }); seed(raw, "waiting", { sub: "pending" });
  const s = stubFetch(() => new Response(`Night in Bethlehem ${year} Bethlehem`));
  try { assert.equal((await (await call(env)).json()).checked, 0); assert.equal(s.calls.length, 0, "no page was fetched"); } finally { s.restore(); }
});

test("at most 6 events per run", async () => {
  const { env, raw } = newEnv(); for (let i = 0; i < 9; i++) seed(raw, "u-m" + i);
  const s = stubFetch(() => new Response(`Night in Bethlehem ${year} Bethlehem`));
  try { const j = await (await call(env)).json(); assert.deepEqual([j.checked, j.confirmed], [6, 6]); const k = await (await call(env)).json(); assert.equal(k.checked, 3); } finally { s.restore(); }
});
