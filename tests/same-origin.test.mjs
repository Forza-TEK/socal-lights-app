// F-42: sameOrigin() on state-changing requests without an Origin header.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { sameOrigin, sameOriginStrict } from "../functions/_lib/auth.js";

const U = "https://socallights.app/api/x";
const req = (method, headers = {}) => new Request(U, { method, headers: { "x-bare-client": "1", ...headers } });

test("F-42: with an Origin header it must match (unchanged)", () => {
  assert.equal(sameOrigin(req("POST", { origin: "https://socallights.app" })), true);
  assert.equal(sameOrigin(req("POST", { origin: "https://evil.example" })), false);
  assert.equal(sameOrigin(req("POST", { origin: "https://evil.example", "sec-fetch-site": "same-origin" })), false);
});

test("F-42: no Origin on a state-changing request passes only for Sec-Fetch-Site same-origin or none", () => {
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(sameOrigin(req(m)), false, m + " with no browser headers is refused");
    assert.equal(sameOrigin(req(m, { "sec-fetch-site": "cross-site" })), false);
    assert.equal(sameOrigin(req(m, { "sec-fetch-site": "same-site" })), false);
    assert.equal(sameOrigin(req(m, { "sec-fetch-site": "same-origin" })), true);
    assert.equal(sameOrigin(req(m, { "sec-fetch-site": "none" })), true);
  }
});

test("F-42: reads without Origin still pass", () => {
  assert.equal(sameOrigin(req("GET")), true);
  assert.equal(sameOrigin(req("HEAD")), true);
});

test("F-42: the admin/chat gate (sameOriginStrict) keeps scripts with an Access token working", () => {
  assert.equal(sameOriginStrict(req("POST")), true);
  assert.equal(sameOriginStrict(req("POST", { origin: "https://evil.example" })), false);
});

test("F-42: key-protected and cron handlers never call sameOrigin (they would lose access)", () => {
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : []; });
  const keyed = walk("functions").filter((p) => /x-alert-key|ALERT_CRON_KEY|GROK_|OUTREACH_KEY/.test(readFileSync(p, "utf8")));
  assert.ok(keyed.length >= 8, "found the key-protected handlers");
  for (const p of keyed) {
    if (p.endsWith("_lib/auth.js")) continue;
    const src = readFileSync(p, "utf8");
    assert.ok(!/\bsameOrigin\(/.test(src), p + " is key-protected and must not require a browser Origin");
  }
});
