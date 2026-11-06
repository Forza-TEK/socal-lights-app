// /api/auth/me must keep reporting the sign-in methods when the database is unreachable (daily limit or outage), so the page can say "having trouble" instead of "sign-in isn't switched on".
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/auth/me.js";

const req = (cookie) => new Request("https://x.test/api/auth/me", { headers: cookie ? { cookie } : {} });
const env = (extra = {}) => ({ GOOGLE_CLIENT_ID: "g", GOOGLE_CLIENT_SECRET: "s", RESEND_API_KEY: "r", TURNSTILE_SITE_KEY: "t", ...extra });
const brokenDb = { prepare() { throw new Error("D1 exceeded its daily limit"); } };

test("database down with a session cookie: still 200, methods on, degraded flag, nobody signed in", async () => {
  const res = await onRequestGet({ request: req("scl_session=abc"), env: env({ DB: brokenDb }) });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.deepEqual(j.methods, { google: true, email: true });
  assert.equal(j.user, null);
  assert.equal(j.degraded, true);
});

test("database fine: no degraded flag; methods still follow the configured secrets", async () => {
  const j = await (await onRequestGet({ request: req(), env: env({ DB: brokenDb }) })).json(); // no cookie: the database is never asked
  assert.equal(j.degraded, undefined);
  assert.deepEqual(j.methods, { google: true, email: true });
  const off = await (await onRequestGet({ request: req(), env: { DB: brokenDb } })).json();
  assert.deepEqual(off.methods, { google: false, email: false });
});
