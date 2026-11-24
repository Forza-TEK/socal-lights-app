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
