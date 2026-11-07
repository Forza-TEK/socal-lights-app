// Read-only outreach access (for the outreach agent): token required, answers only about the addresses it is given, nothing personal leaves,
// stops follow-ups for anyone who already joined or opted out, flags same-domain matches for review, and fails closed (503) so the caller holds the email.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as check } from "../functions/api/outreach/check.js";
import { onRequestGet as summary } from "../functions/api/outreach/summary.js";
import { newEnv, addUser } from "./_pay.mjs";

const TOKEN = "t".repeat(40), O = "https://socallights.app";
const post = (env, body, tok = TOKEN) => check({ request: new Request(O + "/api/outreach/check", { method: "POST", headers: { "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }), env });
async function setup() {
  const { env, raw } = newEnv({ OUTREACH_TOKEN: TOKEN });
  await addUser(raw, "u1", "clerk@covinaca.gov");
  raw.prepare("INSERT INTO installers (id,slug,name,email) VALUES (?,?,?,?)").run("i1", "bright", "Bright Nights", "hello@brightnights.example");
  raw.prepare("INSERT INTO email_prefs (email,token,optout) VALUES (?,?,1)").run("stop@example.org", "a".repeat(36));
  return { env, raw };
}

test("outreach: needs the token; off without the secret", async () => {
  const { env } = await setup();
  assert.equal((await post(env, { emails: ["a@b.co"] }, "")).status, 401);
  assert.equal((await post(env, { emails: ["a@b.co"] }, "x".repeat(40))).status, 401);
  assert.equal((await post({ ...env, OUTREACH_TOKEN: "" }, { emails: ["a@b.co"] })).status, 503);
  assert.equal((await post({ ...env, OUTREACH_TOKEN: "short" }, { emails: ["a@b.co"] }, "short")).status, 503);
  assert.equal((await summary({ request: new Request(O + "/api/outreach/summary"), env })).status, 401);
});
test("outreach: registered, opted out, same-domain review, unknown, invalid; only roles and flags come back", async () => {
  const { env } = await setup();
  const res = await post(env, { emails: ["Clerk@CovinaCA.gov", "hello+x@brightnights.example", "stop@example.org", "other@covinaca.gov", "nobody@nowhere.example", "not an email"] });
  assert.equal(res.status, 200); const j = await res.json(), by = Object.fromEntries(j.results.map((r) => [r.email, r]));
  assert.deepEqual([by["Clerk@CovinaCA.gov"].status, by["Clerk@CovinaCA.gov"].roles], ["registered", ["account"]]);
  assert.deepEqual([by["hello+x@brightnights.example"].status, by["hello+x@brightnights.example"].roles], ["registered", ["installer"]], "a +tag is the same address");
  assert.equal(by["stop@example.org"].optout, true);
  assert.deepEqual([by["other@covinaca.gov"].status, by["other@covinaca.gov"].review], ["none", "same_domain"], "a colleague at the same business domain is a review, not a guess");
  assert.deepEqual([by["nobody@nowhere.example"].status, by["nobody@nowhere.example"].review], ["none", null]);
  assert.equal(by["not an email"].status, "invalid");
  assert.ok(!/u1|Bright Nights|bright\b/.test(JSON.stringify(j)), "no names or ids");
});
test("outreach: free-mail domains never trigger a same-domain review; the limit is 40; a database failure is a 503", async () => {
  const { env, raw } = await setup();
  await addUser(raw, "u2", "pat@gmail.com");
  const j = await (await post(env, { emails: ["someone.else@gmail.com"] })).json();
  assert.equal(j.results[0].review, null);
  assert.equal((await post(env, { emails: Array.from({ length: 41 }, (_, i) => `a${i}@x.co`) })).status, 400);
  assert.equal((await post({ ...env, DB: { prepare() { throw new Error("down"); }, batch() { throw new Error("down"); } } }, { emails: ["a@b.co"] })).status, 503);
});
test("outreach: gmail dots and +tags are the same account", async () => {
  const { env, raw } = await setup(); await addUser(raw, "u3", "jo.smith@gmail.com");
  const j = await (await post(env, { emails: ["josmith+lights@gmail.com"] })).json();
  assert.equal(j.results[0].status, "registered");
});
test("outreach: summary is counts per day, nothing else", async () => {
  const { env } = await setup();
  const res = await summary({ request: new Request(O + "/api/outreach/summary?since=2020-01-01", { headers: { authorization: "Bearer " + TOKEN } }), env });
  assert.equal(res.status, 200); const j = await res.json();
  const day = Object.values(j.days)[0]; assert.ok(day && day.accounts >= 1);
  assert.ok(!/@/.test(JSON.stringify(j)), "no addresses");
});
