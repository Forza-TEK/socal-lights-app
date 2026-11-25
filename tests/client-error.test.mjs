// The error beacon: a thrown script error reaches the ops log once, noise and strangers do not.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost } from "../functions/api/client-error.js";
import { newEnv } from "./_pay.mjs";

const post = (env, body, origin = "https://socallights.app") => onRequestPost({ request: new Request("https://socallights.app/api/client-error", { method: "POST", headers: { origin, "content-type": "application/json", "CF-Connecting-IP": "203.0.113.5" }, body: typeof body === "string" ? body : JSON.stringify(body) }), env });
const rows = (raw) => raw.prepare("SELECT kind, detail FROM ops_log WHERE kind = 'client_error'").all();

test("a script error is logged once an hour, with the page, file and line; noise, oversize and other sites' posts are not", async () => {
  const { env, raw } = newEnv();
  assert.equal((await post(env, { m: "Cannot read properties of null (reading 'x')", f: "app.js?v=2", p: "/", l: 812 })).status, 204);
  assert.equal((await post(env, { m: "Cannot read properties of null (reading 'x')", f: "app.js", p: "/", l: 812 })).status, 204);
  const r = rows(raw); assert.equal(r.length, 1, "the same line is filed once"); assert.match(r[0].detail, /^\/ app\.js:812 Cannot read properties of null/);
  await post(env, { m: "ResizeObserver loop limit exceeded", f: "app.js", p: "/", l: 1 }); await post(env, { m: "Script error.", p: "/" }); await post(env, "{not json"); await post(env, { m: "x".repeat(3000) });
  assert.equal(rows(raw).length, 1, "noise, bad JSON and oversize are dropped quietly");
  assert.equal((await post(env, { m: "boom", p: "/" }, "https://evil.example")).status, 403);
});
test("the map loads the beacon, and it stays small and sends only what the endpoint reads", () => {
  assert.match(readFileSync("public/index.html", "utf8"), /<script src="\/errors\.js\?v=\w+" defer><\/script>/);
  const js = readFileSync("public/errors.js", "utf8"); assert.ok(js.length < 1500); assert.match(js, /n\+\+ >= 3/.test(js) ? /n\+\+ >= 3/ : /n\+\+ >= 3/);
});

test("iOS autofill and in-app browser scripts are noise: not stored, hidden if already stored, and the beacon ignores errors with no file of ours", async () => {
  const { env, raw } = newEnv();
  await post(env, { m: "ReferenceError: Can't find variable: _AutofillCallbackHandler", f: "", p: "/", l: 1 });
  assert.equal(rows(raw).length, 0);
  raw.prepare("INSERT INTO ops_log (kind, detail) VALUES ('client_error', '/ :1 ReferenceError: Can''t find variable: _AutofillCallbackHandler')").run();
  const { errorsLast7 } = await import("../functions/_lib/adminhealth.js");
  assert.equal((await errorsLast7(env)).total, 0, "a stored noise row is not counted on the dashboard");
  const js = readFileSync("public/errors.js", "utf8"); assert.match(js, /!e\.filename \|\| e\.filename\.indexOf\(location\.origin\) !== 0/);
});

test("GET /api/error-report: key required, real errors with examples, noise and notices left out", async () => {
  const { onRequestGet } = await import("../functions/api/error-report.js");
  const KEY = "report-key-0123456789abcdef";
  const { env, raw } = newEnv({ ALERT_CRON_KEY: KEY });
  const ins = raw.prepare("INSERT INTO ops_log (kind, detail) VALUES (?, ?)");
  ins.run("client_error", "/ app.js:812 TypeError: x is null"); ins.run("client_error", "/ :1 ReferenceError: Can't find variable: _AutofillCallbackHandler");
  ins.run("webhook", "stripe signature failed"); ins.run("deploy-stalled", "stuck"); ins.run("outreach", "ok 3 checked");
  const get = (key, q = "") => onRequestGet({ request: new Request("https://socallights.app/api/error-report" + q, { headers: key ? { "x-alert-key": key } : {} }), env });
  assert.equal((await get(null)).status, 401); assert.equal((await get("wrong-wrong-wrong-wrong")).status, 401);
  const r = await (await get(KEY)).json();
  assert.equal(r.ok, true); assert.equal(r.total, 2);
  assert.deepEqual(r.errors.map((g) => g.kind).sort(), ["client_error", "webhook"]);
  assert.deepEqual(r.errors.find((g) => g.kind === "client_error").examples, ["/ app.js:812 TypeError: x is null"]);
  assert.equal((await (await get(KEY, "?hours=500")).json()).window_hours, 168); assert.equal((await (await get(KEY, "?hours=0")).json()).window_hours, 24);
});
