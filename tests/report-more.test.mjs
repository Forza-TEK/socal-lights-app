// F-43: Report or hide on contest entries and installer pages (Apple 1.2), through the existing POST /api/report.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as installerPage } from "../functions/installer/[slug].js";
import { onRequestPost as report } from "../functions/api/report.js";
import { newEnv } from "./_pay.mjs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("the installer page carries a Report or hide link and loads the report script", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO installers (id, slug, name, status) VALUES ('i1','acme-lights','Acme Lights','active')").run();
  const res = await installerPage({ request: new Request("https://socallights.app/installer/acme-lights"), env, params: { slug: "acme-lights" } });
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<a data-report="i-acme-lights\|Acme Lights"[^>]*>Report or hide<\/a>/);
  assert.match(html, /<script src="\/report\.js\?v=\d+[a-z]*" defer><\/script>/);
});

test("contest entries (gallery and ballot rows) and the contest itself have a Report link", () => {
  const html = read("public/contest.html");
  assert.match(html, /<script src="\/report\.js\?v=/);
  assert.match(html, /const reportA = \(e\) => `<a data-report="h-\$\{esc\(e\.id\)\}\|/, "an entry reports with the same h-<post id> ref a home uses");
  assert.equal((html.match(/\$\{reportA\(e\)\}/g) || []).length, 1, "homeLinks (used by both the gallery and the ballot rows) includes it");
  assert.equal((html.match(/data-rkey="h-\$\{esc\(e\.id\)\}"/g) || []).length, 2, "both row kinds can be hidden for me");
  assert.match(html, /data-report="c-\$\{esc\(c\.slug\)\}\|/);
});

test("report.js posts to /api/report with the reason, and the endpoint stores an entry, an installer and a contest report", async () => {
  const js = read("public/report.js");
  assert.match(js, /fetch\("\/api\/report"/); assert.match(js, /reason: f\.why\.value/); assert.match(js, /socal-hidden/);
  const { env, raw } = newEnv();
  for (const ref of ["h-post1", "i-acme-lights", "c-my-contest"]) {
    const r = await report({ request: new Request("https://socallights.app/api/report", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.9" }, body: JSON.stringify({ ref, name: "X", reason: "objectionable" }) }), env });
    assert.equal(r.status, 200);
  }
  assert.deepEqual(raw.prepare("SELECT ref FROM reports ORDER BY rowid").all().map((r) => r.ref), ["h-post1", "i-acme-lights", "c-my-contest"]);
});
