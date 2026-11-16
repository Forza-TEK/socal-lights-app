// First-vote Turnstile check (owner decision 2026-11-16): the first vote of an account in a contest with a prize or run by a city needs the "I am human" check;
// later votes in the same contest and every vote in other contests need none.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as vote } from "../functions/api/contests/[slug]/vote.js";
import { hasPrize, cityRun, needsFirstVoteCheck } from "../functions/_lib/contests.js";
import { newEnv as baseEnv, addUser, stubFetch, compEveryone } from "./_pay.mjs";

const O = "https://socallights.app";
const newEnv = () => { const r = baseEnv({ TURNSTILE_SECRET: "ts_secret" }); compEveryone(r.raw); return r; };
async function at(iso, fn) {
  const RealDate = Date, t = RealDate.parse(iso);
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } }
  globalThis.Date = FakeDate;
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}
// o: org, prize_mode, prize, prizes, site, email
function seed(raw, o = {}) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,prize_mode,prize,prizes,site) VALUES ('c1','show','uO','Show Contest',?,'Pasadena','Los Angeles','christmas','live','2026-12-10','2026-12-12','2026-12-20',?,'public','pick',?,'A contest for the neighbors.','manual',?,?,?,?)")
    .run(o.org || "Maple Street Lights", JSON.stringify(["Best Overall", "Most Creative"]), o.email || "owner@gmail.com", o.prize_mode || "none", o.prize || "", JSON.stringify(o.prizes || {}), o.site || "");
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES (?,'approved',?,?,'Pasadena',34.1,-118.1,'d','[]',?,'christmas',?,?,'91101','c1',?,?,datetime('now'))");
  for (const [i, p] of ["a", "b"].entries()) { raw.prepare("INSERT OR IGNORE INTO users (id,email,name) VALUES (?,?,?)").run("e" + p, `${p}@example.com`, ""); ins.run("p" + p, "Biz " + p, "Home " + p, `${p}@example.com`, `${i + 1} Oak St`, `${i + 1} Oak St`, "e" + p, i + 1); }
}
const cast = async (env, cookie, body) => { const r = await vote({ params: { slug: "show" }, request: new Request(O + "/api/contests/show/vote", { method: "POST", headers: { "content-type": "application/json", cookie, "CF-Connecting-IP": "198.51.100.1" }, body: JSON.stringify(body) }), env }); return { http: r.status, ...(await r.json().catch(() => ({}))) }; };
// Turnstile stub: only the token "good" passes.
const turnstile = () => stubFetch(async (url, init) => { const t = init && init.body && init.body.get ? init.body.get("response") : ""; return new Response(JSON.stringify({ success: t === "good" }), { status: 200, headers: { "content-type": "application/json" } }); });
const V = (post_id, category, token) => ({ post_id, category, ...(token !== undefined ? { "cf-turnstile-response": token } : {}) });
const votes = (raw) => raw.prepare("SELECT COUNT(*) n FROM votes").get().n;

test("rule: a prize (one for all, or one per award) or a city organizer needs the check; a plain contest does not", () => {
  assert.equal(hasPrize({ prize_mode: "one", prize: "$50 gift card" }), true);
  assert.equal(hasPrize({ prize_mode: "one", prize: "  " }), false);
  assert.equal(hasPrize({ prize_mode: "each", prizes: JSON.stringify({ "Best|public": "", "Best|judge": "Trophy" }) }), true);
  assert.equal(hasPrize({ prize_mode: "each", prizes: JSON.stringify({ "Best|public": "" }) }), false);
  assert.equal(hasPrize({ prize_mode: "none", prize: "ignored" }), false);
  assert.equal(cityRun({ org: "City of Covina" }), true);
  assert.equal(cityRun({ org: "Town of Apple Valley" }), true);
  assert.equal(cityRun({ org: "Maple Street Lights", site: "https://eastvaleca.gov/lights" }), true);
  assert.equal(cityRun({ org: "Maple Street Lights", contact_email: "clerk@covinaca.gov" }), true);
  assert.equal(cityRun({ org: "Maple Street Lights", site: "https://maple.example.com", contact_email: "x@gmail.com" }), false);
  assert.equal(cityRun({ org: "Oak Park HOA", contact_email: "x@gmail.com" }), false, "an HOA or school is not a city");
  assert.equal(needsFirstVoteCheck({ org: "Maple Street Lights", prize_mode: "none" }), false);
});

test("prize contest: the first vote needs a token; no token or a bad token is refused with a clear message and nothing is saved", async () => {
  const { env, raw } = newEnv(); seed(raw, { prize_mode: "one", prize: "$50 gift card" }); const u = await addUser(raw, "v1", "v1@example.com"); const ts = turnstile();
  try {
    await at("2026-12-13T12:00:00Z", async () => {
      const none = await cast(env, u.cookie, V("pa", "Best Overall"));
      assert.equal(none.http, 400); assert.equal(none.needs_check, true); assert.match(none.error, /I am human/);
      const bad = await cast(env, u.cookie, V("pa", "Best Overall", "wrong"));
      assert.equal(bad.http, 400); assert.equal(bad.needs_check, true); assert.match(bad.error, /did not pass/);
      assert.equal(votes(raw), 0);
      const ok = await cast(env, u.cookie, V("pa", "Best Overall", "good"));
      assert.equal(ok.http, 200); assert.equal(ok.ok, true); assert.equal(votes(raw), 1);
    });
  } finally { ts.restore(); }
});

test("prize contest: the second vote by the same account (another category, or moving a vote) needs no token", async () => {
  const { env, raw } = newEnv(); seed(raw, { prize_mode: "each", prizes: { "Best Overall|public": "Trophy" } }); const u = await addUser(raw, "v1", "v1@example.com"); const ts = turnstile();
  try {
    await at("2026-12-13T12:00:00Z", async () => {
      assert.equal((await cast(env, u.cookie, V("pa", "Best Overall", "good"))).http, 200);
      const before = ts.calls.length;
      assert.equal((await cast(env, u.cookie, V("pb", "Most Creative"))).http, 200, "second category, no token");
      assert.equal((await cast(env, u.cookie, V("pb", "Best Overall"))).http, 200, "moving the first vote, no token");
      assert.equal(ts.calls.length, before, "Turnstile was not asked again");
      assert.equal(votes(raw), 2);
    });
  } finally { ts.restore(); }
});

test("another voter in the same contest still needs their own first-vote check", async () => {
  const { env, raw } = newEnv(); seed(raw, { prize_mode: "one", prize: "Gift card" }); const a = await addUser(raw, "v1", "v1@example.com"), b = await addUser(raw, "v2", "v2@example.com"); const ts = turnstile();
  try {
    await at("2026-12-13T12:00:00Z", async () => {
      assert.equal((await cast(env, a.cookie, V("pa", "Best Overall", "good"))).http, 200);
      assert.equal((await cast(env, b.cookie, V("pa", "Best Overall"))).http, 400);
    });
  } finally { ts.restore(); }
});

test("city-run contest without a prize: the first vote needs a token too", async () => {
  const { env, raw } = newEnv(); seed(raw, { org: "City of Covina" }); const u = await addUser(raw, "v1", "v1@example.com"); const ts = turnstile();
  try {
    await at("2026-12-13T12:00:00Z", async () => {
      assert.equal((await cast(env, u.cookie, V("pa", "Best Overall"))).needs_check, true);
      assert.equal((await cast(env, u.cookie, V("pa", "Best Overall", "good"))).http, 200);
    });
  } finally { ts.restore(); }
});

test("non-prize, non-city contest: unaffected (no token, no Turnstile call)", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "v1", "v1@example.com"); const ts = turnstile();
  try {
    await at("2026-12-13T12:00:00Z", async () => {
      const r = await cast(env, u.cookie, V("pa", "Best Overall")); assert.equal(r.http, 200); assert.equal(r.ok, true);
      assert.equal(ts.calls.length, 0);
    });
  } finally { ts.restore(); }
});

test("other refusals still come first and need no token (own home, voting closed)", async () => {
  const { env, raw } = newEnv(); seed(raw, { prize_mode: "one", prize: "Gift card" }); const u = await addUser(raw, "v1", "v1@example.com");
  await at("2026-12-01T12:00:00Z", async () => { const r = await cast(env, u.cookie, V("pa", "Best Overall")); assert.equal(r.http, 400); assert.match(r.error, /isn't open/); assert.ok(!r.needs_check); });
});

test("the vote page asks for the check, shows the server's message and sends the token with the vote", () => {
  const h = readFileSync("public/contest.html", "utf8");
  assert.match(h, /j\.needs_check/); assert.match(h, /humanCheck\(j\.error\)/); assert.match(h, /"cf-turnstile-response"/); assert.match(h, /turnstile\.render/);
  assert.match(h, /hc-m" role="alert"/, "the reason is announced");
});
