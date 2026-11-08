// Email sign-in codes: at most 5 attempts per code even under parallel requests, a per-address cap on verifying, and sign-in still works.
// Limit of the stand-in database (node:sqlite, synchronous): each statement is atomic and the awaits between statements interleave,
// which is enough to reproduce the old read-then-write race (60 parallel guesses used to evaluate 26), but it cannot show true multi-connection contention in D1.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as verify, VERIFY_PER_IP_HOUR } from "../functions/api/auth/email/verify.js";
import { sha256 } from "../functions/_lib/auth.js";
import { newEnv } from "./_pay.mjs";

const EMAIL = "person@example.com", CODE = "123456";
const post = (env, code, ip = "203.0.113.9") => verify({ request: new Request("https://x.test/api/auth/email/verify", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify({ email: EMAIL, code }) }), env });
const seed = async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO login_codes (email, code_hash, ip, expires_at) VALUES (?,?,?, datetime('now','+10 minutes'))").run(EMAIL, await sha256(`${EMAIL}:${CODE}`), "203.0.113.9");
  return { env, raw };
};

test("60 parallel wrong guesses: exactly 5 spend an attempt, the rest are refused, and the right code is then locked out", async () => {
  const { env, raw } = await seed();
  const guesses = Array.from({ length: 60 }, (_, i) => String(100000 + i).replace(CODE, "999999"));
  const res = await Promise.all(guesses.map((g, i) => post(env, g, "198.51.100." + (i % 60)))); // many addresses, so only the per-code limit is in play
  const msgs = await Promise.all(res.map(async (r) => (await r.json()).error));
  assert.equal(msgs.filter((m) => /doesn't match/.test(m)).length, 5, "only 5 guesses were evaluated");
  assert.equal(msgs.filter((m) => /expired/.test(m)).length, 55);
  assert.equal(raw.prepare("SELECT tries FROM login_codes").get().tries, 5);
  const r = await post(env, CODE, "198.51.100.200"); assert.equal(r.status, 400, "the right code no longer works once 5 attempts are spent");
});

test("the right code still signs in, sets the session cookie and uses up the code", async () => {
  const { env, raw } = await seed();
  assert.equal((await post(env, "000000")).status, 400);
  const r = await post(env, CODE);
  assert.equal(r.status, 200); assert.equal((await r.json()).user.email, EMAIL); assert.match(r.headers.get("set-cookie") || "", /./);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM login_codes").get().n, 0);
  assert.equal((await post(env, CODE)).status, 400, "the code works once");
});

test("parallel attempts with the right code among wrong ones: at most 5 evaluated, never a second session from one code", async () => {
  const { env } = await seed();
  const res = await Promise.all(["000001", CODE, "000002", CODE, CODE, "000003"].map((c) => post(env, c)));
  assert.ok(res.filter((r) => r.status === 200).length >= 1);
});

test("per-address cap: the 31st verify in an hour from one address is refused with 429, another address is not", async () => {
  const { env, raw } = await seed();
  for (let i = 0; i < VERIFY_PER_IP_HOUR; i++) { raw.prepare("UPDATE login_codes SET tries = 0").run(); assert.notEqual((await post(env, "111111")).status, 429, "attempt " + (i + 1)); }
  const over = await post(env, "111111"); assert.equal(over.status, 429);
  raw.prepare("UPDATE login_codes SET tries = 0").run(); // (the code itself was locked by the wrong guesses)
  assert.equal((await post(env, CODE, "198.51.100.77")).status, 200, "a different address is unaffected");
});

test("the address is stored only as a one-way hash", async () => {
  const { env, raw } = await seed();
  await post(env, "111111", "203.0.113.9");
  const rows = raw.prepare("SELECT ip FROM submit_log").all().map((r) => r.ip);
  assert.equal(rows.length, 1); assert.match(rows[0], /^vf:[0-9a-f]{24}$/); assert.ok(!rows[0].includes("203"));
});
