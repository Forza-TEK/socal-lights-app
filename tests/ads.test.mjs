// Run with: node --test tests/   (Ads link for Grok: brief, assets, report, status, warnings, and the read-only Admin > Ads data.)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv, freezeNow } from "./_pay.mjs";
import { onRequest as brief } from "../functions/api/ads/brief.js";
import { onRequest as assets } from "../functions/api/ads/assets.js";
import { onRequest as report } from "../functions/api/ads/report.js";
import { onRequest as status } from "../functions/api/ads/status.js";
import { onRequestGet as adminAds } from "../functions/api/admin/ads.js";
import { computeWarnings } from "../functions/_lib/ads.js";

const KEY = "test-ads-key-0123456789abcdefghij";
const NOW = "2026-11-20T18:00:00Z";
const LAUNCH = ["ct-a-meta", "ct-b-meta", "ev-a-meta", "ev-b-meta", "in-a-meta", "in-b-meta", "fa-a-meta", "fa-b-meta", "fa-c-meta", "ho-a-meta", "ho-b-meta"];
const MANIFEST = { version: 1, files: [
  { asset_id: "a03-contest-screens", path: "a03-contest-screens/a03 entry.png", content_type: "image/png", bytes: 10, sha256: "ab".repeat(32), width: 1080, height: 1350, ratio: "4:5" },
  { asset_id: "a01-page-images", path: "a01-page-images/cover.png", content_type: "image/png", bytes: 5, sha256: "cd".repeat(32) },
] };
const mk = (extra = {}) => {
  const { env, raw } = newEnv({ ADS_API_KEY: KEY, ASSETS: { fetch: async (req) => (new URL(req.url).pathname === "/ad-assets/manifest.json" ? new Response(JSON.stringify(MANIFEST)) : new Response("no", { status: 404 })) }, ...extra });
  return { env, raw };
};
const call = (handler, env, path, { method = "GET", body, key = KEY, auth } = {}) => {
  const headers = { "content-type": "application/json" };
  if (auth !== undefined) headers.authorization = auth; else if (key) headers.authorization = "Bearer " + key;
  return handler({ request: new Request("https://socallights.app/api/ads/" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), headers: r.headers }));
};
const row = (o = {}) => ({ ad_id: "ct-a-meta", campaign: "contest_organizers", status: "active", spend_cents: 500, impressions: 1000, clicks: 20, as_of: "2026-11-20T09:00:00-08:00", ...o });
const send = (env, rows) => call(report, env, "report", { method: "POST", body: { rows } });
const withNow = async (iso, fn) => { const undo = freezeNow(iso); try { return await fn(); } finally { undo(); } };
const codes = (r) => r.body.warnings.map((w) => w.code);

test("migration: Meta only, launch set approved, six not in launch, budgets add up to $280", () => {
  const { raw } = mk();
  const items = raw.prepare("SELECT id, status, wave, platform, audience FROM ads_items ORDER BY id").all();
  assert.deepEqual(items.filter((i) => i.status === "approved").map((i) => i.id).sort(), [...LAUNCH].sort());
  assert.deepEqual(items.filter((i) => i.status === "not_in_launch").map((i) => i.id).sort(), ["ct-c-meta", "ev-c-meta", "fa-d-meta", "fa-e-meta", "ho-c-meta", "in-c-meta"]);
  assert.ok(items.every((i) => i.platform === "meta" && /-meta$/.test(i.id)));
  assert.equal(raw.prepare("SELECT SUM(budget_cents) AS n FROM ads_campaigns").get().n, 28000);
  const c = Object.fromEntries(raw.prepare("SELECT audience, budget_cents, starts, ends FROM ads_campaigns").all().map((r) => [r.audience, r]));
  assert.deepEqual([c.contest_organizers.budget_cents, c.contest_organizers.starts, c.contest_organizers.ends], [5500, "2026-11-12", "2026-12-08"]);
  assert.deepEqual([c.event_holders.budget_cents, c.event_holders.ends], [4500, "2026-12-01"]);
  assert.deepEqual([c.installers.budget_cents, c.installers.ends], [2000, "2026-11-23"]);
  assert.deepEqual([c.families.budget_cents, c.families.starts], [10000, "2026-11-24"]);
  assert.deepEqual([c.homeowners.budget_cents, c.homeowners.ends], [6000, "2026-12-08"]);
  assert.throws(() => raw.prepare("INSERT INTO ads_items (id, audience, platform, headline, primary_text, landing_url, starts, ends, status) VALUES ('x','families','google','h','p','u','a','b','approved')").run());
});

test("auth: every endpoint needs the key (401), a missing or short secret is 503, bad methods 405", async () => {
  const { env } = mk();
  for (const [h, p, m] of [[brief, "brief", "GET"], [assets, "assets", "GET"], [status, "status", "GET"], [report, "report", "POST"]]) {
    for (const o of [{ key: "" }, { key: "wrong-key-wrong-key-wrong-key" }, { key: KEY.slice(0, -1) }, { key: KEY + "x" }, { auth: "Basic " + KEY }, { auth: "Bearer" }, { auth: KEY }]) {
      const r = await call(h, env, p, { method: m, body: m === "POST" ? { rows: [row()] } : undefined, ...o });
      assert.equal(r.status, 401, p + " " + JSON.stringify(o)); assert.equal(r.body.ads, undefined); assert.equal(r.body.campaigns, undefined);
    }
  }
  for (const secret of [undefined, "", "short"]) {
    const { env: e2 } = newEnv(secret === undefined ? {} : { ADS_API_KEY: secret });
    assert.equal((await call(brief, e2, "brief", { key: secret || "anything-anything-12345" })).status, 503);
  }
  assert.equal((await call(report, env, "report", { method: "GET" })).status, 405);
  assert.equal((await call(brief, env, "brief", { method: "POST", body: {} })).status, 405);
  assert.equal((await call(brief, env, "brief")).status, 200);
});

test("auth: the key is compared as equal-length digests, never with === on the secret", () => {
  const src = readFileSync("functions/_lib/ads.js", "utf8");
  assert.match(src, /sha256\(String\(a\)\)[\s\S]*\^=|\^ y\.charCodeAt/);
  assert.doesNotMatch(src, /===\s*secret|secret\s*===|=== env\.ADS_API_KEY/);
  assert.ok(!/ADS_API_KEY\s*=\s*["']/.test(src), "no key in code");
});

test("rate limit: 60 calls a minute per key, the 61st is 429 with retry-after, a new minute is allowed", async () => {
  const { env, raw } = mk();
  for (let i = 0; i < 60; i++) assert.equal((await call(status, env, "status")).status, 200, "call " + (i + 1));
  const r = await call(brief, env, "brief");
  assert.equal(r.status, 429); assert.ok(r.headers.get("retry-after"));
  assert.equal((await call(status, env, "status", { key: "wrong-key-wrong-key-wrong" })).status, 401, "a wrong key is refused before it counts");
  const real = Date.now; Date.now = () => real() + 61_000;
  try { assert.equal((await call(status, env, "status")).status, 200); } finally { Date.now = real; }
  assert.ok(raw.prepare("SELECT * FROM outreach_rate").all().length <= 2);
});

test("brief: only the 11 launch-set ads, campaigns, rules, budget facts and asset URLs", async () => {
  const { env } = mk();
  const r = await call(brief, env, "brief");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.ads.map((a) => a.ad_id).sort(), [...LAUNCH].sort());
  assert.ok(r.body.ads.every((a) => a.ad_id.endsWith("-meta") && a.landing_url.startsWith("https://socallights.app/") && a.ref.startsWith("mt-")));
  for (const gone of ["ct-c-meta", "ev-c-meta", "fa-d-meta", "ho-c-meta"]) assert.ok(!JSON.stringify(r.body).includes(`"${gone}"`), gone);
  assert.equal(r.body.budget.total_cents, 30000); assert.equal(r.body.budget.loaded_cents, 28000); assert.equal(r.body.budget.reserve_cents, 2000); assert.equal(r.body.budget.all_ads_end, "2026-12-08");
  assert.equal(r.body.campaigns.length, 5); assert.equal(r.body.campaigns.reduce((s, c) => s + c.budget_cents, 0), 28000);
  assert.ok(r.body.targeting.counties.includes("Los Angeles") && r.body.targeting.type === "county only");
  assert.ok(r.body.rules.some((x) => /without the owner/.test(x)));
  const a03 = r.body.ads.find((a) => a.ad_id === "ct-a-meta").assets[0];
  assert.equal(a03.url, "https://socallights.app/ad-assets/a03-contest-screens/a03%20entry.png"); assert.equal(a03.sha256, "ab".repeat(32));
  assert.deepEqual(r.body.ads.find((a) => a.ad_id === "ho-a-meta").assets, []);
  const email = /[^\s"]+@[^\s"]+\.[a-z]{2,}/i.exec(JSON.stringify(r.body));
  assert.equal(email, null, "no email address anywhere");
});

test("brief: a hold or rejected item leaves the brief", async () => {
  const { env, raw } = mk();
  raw.prepare("UPDATE ads_items SET status = 'hold' WHERE id = 'ct-b-meta'").run();
  const r = await call(brief, env, "brief");
  assert.equal(r.body.ads.length, 10); assert.ok(!r.body.ads.some((a) => a.ad_id === "ct-b-meta"));
});

test("assets: absolute URLs, sha256, the ad ids that use each file, and ads without files", async () => {
  const { env } = mk();
  const r = await call(assets, env, "assets");
  assert.equal(r.status, 200); assert.equal(r.body.count, 2);
  const f = r.body.files.find((x) => x.asset_id === "a03-contest-screens");
  assert.deepEqual(f.ad_ids, ["ct-a-meta"]); assert.match(f.url, /^https:\/\/socallights\.app\/ad-assets\//); assert.equal(f.sha256.length, 64);
  assert.deepEqual(r.body.files.find((x) => x.asset_id === "a01-page-images").ad_ids, []);
  assert.ok(r.body.ads_missing_files.some((m) => m.ad_id === "fa-a-meta")); assert.deepEqual(r.body.ads_without_asset, ["ho-a-meta"]);
  const { env: e2 } = newEnv({ ADS_API_KEY: KEY }); // no ASSETS binding at all
  assert.equal((await call(assets, e2, "assets")).body.count, 0);
});

test("report: a good batch is stored, the latest row per ad wins, the log keeps history", async () => {
  await withNow(NOW, async () => {
    const { env, raw } = mk();
    const a = await send(env, [row(), row({ ad_id: "ct-b-meta", status: "in_review", spend_cents: 0, impressions: 0, clicks: 0 })]);
    assert.equal(a.status, 200); assert.equal(a.body.accepted, 2); assert.deepEqual(a.body.warnings, []);
    assert.equal(a.body.totals.spend_cents, 500);
    const b = await send(env, [row({ spend_cents: 900, as_of: "2026-11-21" })]);
    assert.equal(b.status, 200); assert.equal(b.body.totals.spend_cents, 900);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ads_reports").get().n, 2);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ads_report_log").get().n, 3);
    assert.equal(raw.prepare("SELECT spend_cents FROM ads_reports WHERE ad_id = 'ct-a-meta'").get().spend_cents, 900);
    assert.equal(raw.prepare("SELECT as_of FROM ads_reports WHERE ad_id = 'ct-a-meta'").get().as_of, "2026-11-21T12:00:00Z");
  });
});

test("report: validation rejects nonsense and stores nothing (one bad row rejects the batch)", async () => {
  await withNow(NOW, async () => {
    const { env, raw } = mk();
    const bad = [
      row({ ad_id: "CT A" }), row({ ad_id: undefined }), row({ campaign: "everyone" }), row({ status: "running" }), row({ spend_cents: -1 }), row({ spend_cents: 12.5 }), row({ spend_cents: "500" }),
      row({ spend_cents: 99_000_000 }), row({ impressions: -5 }), row({ clicks: 5000 }), row({ as_of: "yesterday" }), row({ as_of: "2026-11-25" }), row({ as_of: "2025-01-01" }), row({ as_of: undefined }),
      row({ status: "disapproved" }), row({ status: "disapproved", disapproval_reason: "x".repeat(301) }), row({ status: "disapproved", disapproval_reason: "mail jo@example.com about it" }),
      row({ status: "disapproved", disapproval_reason: "call 555-123-4567" }), { ...row(), email: "a@example.com" }, { ...row(), audience: "women 25-34" }, null, "ct-a-meta", [],
    ];
    for (const b of bad) {
      const r = await send(env, [row({ ad_id: "ct-b-meta" }), b]);
      assert.equal(r.status, 400, JSON.stringify(b)); assert.ok(r.body.error && r.body.errors.length);
    }
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ads_reports").get().n, 0, "a valid row next to a bad one is not stored either");
    for (const body of [null, {}, { rows: "x" }, { rows: [] }, [row()], { rows: [row()], note: "hi" }]) assert.equal((await call(report, env, "report", { method: "POST", body })).status, 400, JSON.stringify(body));
    const dup = await send(env, [row(), row()]); assert.equal(dup.status, 400);
    const mismatch = await send(env, [row({ campaign: "families" })]); assert.equal(mismatch.status, 400); assert.match(mismatch.body.errors[0], /belongs to campaign contest_organizers/);
    const raw413 = await env.DB && await report({ request: new Request("https://socallights.app/api/ads/report", { method: "POST", headers: { authorization: "Bearer " + KEY }, body: " ".repeat(70000) }), env });
    assert.equal(raw413.status, 413);
  });
});

test("report: at most 100 rows a call", async () => {
  await withNow(NOW, async () => {
    const { env, raw } = mk();
    const rows = (n) => Array.from({ length: n }, (_, i) => row({ ad_id: "x-ad-" + i, spend_cents: 1, impressions: 10, clicks: 0 }));
    assert.equal((await send(env, rows(101))).status, 400);
    const ok = await send(env, rows(100));
    assert.equal(ok.status, 200); assert.equal(ok.body.accepted, 100); assert.ok(codes(ok).includes("not_in_launch_set"));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ads_reports").get().n, 100);
    const more = await send(env, rows(1).map((r) => ({ ...r, ad_id: "x-ad-extra" })));
    assert.equal(more.status, 400, "the table of reported ads is capped too");
  });
});

test("warnings: spend over $280 loaded, over $300 total, over a campaign budget", async () => {
  await withNow(NOW, async () => {
    const { env } = mk();
    const a = await send(env, [row({ spend_cents: 5500 }), row({ ad_id: "fa-a-meta", campaign: "families", spend_cents: 10000 }), row({ ad_id: "ho-a-meta", campaign: "homeowners", spend_cents: 6000 }), row({ ad_id: "ev-a-meta", campaign: "event_holders", spend_cents: 4500 })]);
    assert.deepEqual(codes(a), [], "exactly on budget is fine: " + a.body.totals.spend_cents);
    const b = await send(env, [row({ ad_id: "fa-b-meta", campaign: "families", spend_cents: 2500, as_of: "2026-11-20" })]);
    assert.ok(codes(b).includes("over_loaded_budget")); assert.ok(!codes(b).includes("over_total_budget")); assert.ok(codes(b).includes("campaign_over_budget"));
    const c = await send(env, [row({ ad_id: "in-a-meta", campaign: "installers", spend_cents: 2100, as_of: "2026-11-20" })]);
    assert.ok(codes(c).includes("over_total_budget")); assert.ok(!codes(c).includes("over_loaded_budget"), "the worse one replaces the milder one");
    assert.match(c.body.warnings.find((w) => w.code === "over_total_budget").message, /\$300/);
  });
});

test("warnings: Dec 8 rule, a campaign past its own end, disapproved, not in the launch set", async () => {
  await withNow("2026-12-09T20:00:00Z", async () => {
    const { env } = mk();
    const r = await send(env, [row({ as_of: "2026-12-09T10:00:00-08:00" }), row({ ad_id: "fa-a-meta", campaign: "families", status: "paused", as_of: "2026-12-09" })]);
    assert.ok(codes(r).includes("active_after_dec8")); assert.equal(r.body.warnings.filter((w) => w.code === "active_after_dec8").length, 1, "a paused ad is fine");
  });
  await withNow(NOW, async () => {
    const { env } = mk();
    const ok = await send(env, [row({ as_of: "2026-12-08" }), row({ ad_id: "fa-a-meta", campaign: "families", as_of: "2026-11-20" })]);
    assert.equal(ok.status, 400, "as_of too far ahead is nonsense, not a warning");
    const inst = await send(env, [row({ ad_id: "in-a-meta", campaign: "installers" })]);
    assert.deepEqual(codes(inst), [], "installers end Nov 23, today is Nov 20: not yet");
  });
  await withNow("2026-11-25T20:00:00Z", async () => {
    const { env } = mk();
    const inst = await send(env, [row({ ad_id: "in-a-meta", campaign: "installers", as_of: "2026-11-25" }), row({ ad_id: "ct-c-meta", status: "paused", as_of: "2026-11-25" }), row({ ad_id: "ev-a-meta", campaign: "event_holders", status: "disapproved", disapproval_reason: "Policy: personal attributes", as_of: "2026-11-25" })]);
    assert.deepEqual([...new Set(codes(inst))].sort(), ["disapproved", "not_in_launch_set", "past_campaign_end"]);
    assert.match(inst.body.warnings.find((w) => w.code === "disapproved").message, /personal attributes/);
  });
});

test("warnings: no report in 48 hours once ads are due, not before the first start", () => {
  const camps = [{ audience: "installers", budget_cents: 2000, starts: "2026-11-12", ends: "2026-11-23" }];
  const items = [{ id: "in-a-meta", audience: "installers", status: "approved", ends: "2026-11-23" }];
  const reports = [{ ad_id: "in-a-meta", campaign: "installers", status: "active", spend_cents: 100, impressions: 1, clicks: 0, disapproval_reason: "", as_of: "2026-11-13T00:00:00Z", received_at: "2026-11-13T12:00:00Z" }];
  const at = (iso) => computeWarnings({ campaigns: camps, items, reports }, Date.parse(iso)).map((w) => w.code);
  assert.deepEqual(at("2026-11-15T11:00:00Z"), []); assert.deepEqual(at("2026-11-15T13:00:00Z"), ["stale_report"]);
  assert.deepEqual(computeWarnings({ campaigns: camps, items, reports: [] }, Date.parse("2026-11-09T18:00:00Z")).map((w) => w.code), [], "before launch: quiet");
  assert.deepEqual(computeWarnings({ campaigns: camps, items, reports: [] }, Date.parse("2026-11-15T18:00:00Z")).map((w) => w.code), ["stale_report"]);
  assert.deepEqual(computeWarnings({ campaigns: camps, items, reports: [{ ...reports[0], status: "ended" }] }, Date.parse("2026-11-30T18:00:00Z")).map((w) => w.code), [], "all ended: quiet");
});

test("report: an older as_of does not overwrite a newer one; a lower spend is flagged", async () => {
  await withNow(NOW, async () => {
    const { env, raw } = mk();
    await send(env, [row({ spend_cents: 800, as_of: "2026-11-20T10:00:00Z" })]);
    const old = await send(env, [row({ spend_cents: 100, as_of: "2026-11-19T10:00:00Z" })]);
    assert.equal(old.body.accepted, 0); assert.equal(old.body.skipped[0].ad_id, "ct-a-meta");
    assert.equal(raw.prepare("SELECT spend_cents FROM ads_reports").get().spend_cents, 800);
    const down = await send(env, [row({ spend_cents: 700, as_of: "2026-11-20T11:00:00Z" })]);
    assert.ok(codes(down).includes("spend_decreased")); assert.equal(raw.prepare("SELECT spend_cents FROM ads_reports").get().spend_cents, 700);
  });
});

test("report log is append-only and pruned after 90 days", async () => {
  await withNow(NOW, async () => {
    const { env, raw } = mk();
    raw.prepare("INSERT INTO ads_report_log (ad_id, campaign, status, as_of, received_at) VALUES ('ct-a-meta','contest_organizers','active','2026-08-01T00:00:00Z','2026-08-01T00:00:00Z'), ('ct-a-meta','contest_organizers','active','2026-10-01T00:00:00Z','2026-10-01T00:00:00Z')").run();
    await send(env, [row()]);
    assert.deepEqual(raw.prepare("SELECT received_at FROM ads_report_log ORDER BY id").all().map((r) => r.received_at.slice(0, 10)), ["2026-10-01", "2026-11-20"]);
  });
});

test("status: shows what the site holds, missing ads, other reported ads and warnings", async () => {
  await withNow(NOW, async () => {
    const { env } = mk();
    const empty = await call(status, env, "status");
    assert.equal(empty.status, 200); assert.equal(empty.body.last_report_at, null); assert.equal(empty.body.missing.length, 11); assert.equal(empty.body.totals.spend_cents, 0);
    await send(env, [row(), row({ ad_id: "ct-c-meta", status: "paused", spend_cents: 0, impressions: 0, clicks: 0 })]);
    const s = await call(status, env, "status");
    assert.equal(s.body.last_report_at, "2026-11-20T18:00:00Z"); assert.equal(s.body.missing.length, 10);
    assert.equal(s.body.ads.find((a) => a.ad_id === "ct-a-meta").report.spend_cents, 500);
    assert.equal(s.body.other_reported[0].ad_id, "ct-c-meta"); assert.ok(codes(s).includes("not_in_launch_set"));
    assert.equal(s.body.campaigns.find((c) => c.audience === "contest_organizers").spend_cents, 500);
    assert.equal(s.body.totals.budget_cents, 30000);
  });
});

test("admin: read-only data with landings per ref code, alerts and no write handler", async () => {
  await withNow(NOW, async () => {
    const { env, raw } = mk();
    await send(env, [row({ status: "disapproved", disapproval_reason: "Policy" })]);
    raw.prepare("INSERT INTO site_hits (day, page, n) VALUES ('2026-11-15', 'ref:mt-ct-a', 7), ('2026-11-16', 'ref:mt-ct-a', 3), ('2026-11-16', 'ref:other', 99), ('2026-11-01', 'ref:mt-ct-a', 50)").run();
    const r = await adminAds({ env });
    const d = await r.json();
    assert.equal(d.configured, true); assert.equal(d.ads.length, 17);
    assert.equal(d.ads.find((a) => a.id === "ct-a-meta").landings, 10, "only since the first start date, only its own ref");
    assert.ok(d.warnings.some((w) => w.code === "disapproved")); assert.equal(d.totals.budget_cents, 30000); assert.equal(d.log.length, 1);
    const mod = await import("../functions/api/admin/ads.js");
    assert.deepEqual(Object.keys(mod).sort(), ["onRequestGet"], "no POST, PUT or DELETE: ad copy changes only by migration");
  });
});

test("nothing personal: tables hold no email, name or free text beyond a short policy reason", () => {
  const { raw } = mk();
  for (const t of ["ads_reports", "ads_report_log"]) assert.deepEqual(raw.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map((c) => c.name).filter((n) => /mail|name|phone|ip|user|audience_detail/i.test(n)), []);
});
