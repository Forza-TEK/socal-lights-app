// Cloudflare usage (free or Workers Paid, see cflimits.js), read-only, from the Cloudflare GraphQL Analytics API (one query, five-minute cache in D1).
// Needs two Pages secrets: CF_ANALYTICS_TOKEN (API token with Account > Account Analytics > Read) and CF_ACCOUNT_ID. Without them the
// Cloudflare numbers are "not connected"; the email counts (kept by our own code) and the quota errors logged in ops_log still show.
// Nothing here writes to Cloudflare, and no secret is ever logged or returned.
import { metricsFor, planOf, billingDayOf, periodStartFor, overageFor, PLAN_LABELS, PAID_BASE_USD, PRICING_VERIFIED, CACHE_SECONDS, levelFor, LEVEL_RANK, R2_CLASS_A, R2_CLASS_B, THRESHOLDS } from "./cflimits.js";

const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
export const EMAIL_KEY = "fn:email-sent"; // site_hits page key, one row per UTC day (see sendMail in auth.js)

export const utcDay = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const addDays = (day, n) => utcDay(Date.parse(day + "T00:00:00Z") + n * 86400000);
export const sqlTime = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

// Datasets (aliases in the query): the permission each needs is Account > Account Analytics > Read.
const DATASETS = {
  d1: "D1 rows read and written", d1s: "D1 storage", pf: "Pages Functions requests", wk: "Workers requests",
  r2: "R2 operations", r2s: "R2 storage",
};

const DS_OF = { d1_rows_read: "d1", d1_rows_written: "d1", d1_storage: "d1s", requests: "pf", r2_class_a: "r2", r2_class_b: "r2", r2_storage: "r2s" };

// `periodStart` is the first UTC day of the billing month (the monthly sums run from there); the 7-day trend always covers the last 7 days.
export function buildQuery(accountId, day, periodStart = day.slice(0, 8) + "01") {
  const from = addDays(day, -6), r2From = periodStart < from ? periodStart : from;
  const f = (g) => `filter:{${g}}`;
  return `{ viewer { accounts(filter:{accountTag:${JSON.stringify(accountId)}}) {
    d1: d1AnalyticsAdaptiveGroups(limit:200, ${f(`date_geq:"${r2From}"`)}) { dimensions{ date } sum{ rowsRead rowsWritten } }
    d1s: d1StorageAdaptiveGroups(limit:50, orderBy:[datetime_DESC], ${f(`date_geq:"${day}"`)}) { dimensions{ databaseId datetime } max{ databaseSizeBytes } }
    pf: pagesFunctionsInvocationsAdaptiveGroups(limit:1000, ${f(`date_geq:"${r2From}"`)}) { dimensions{ date status } sum{ requests errors } }
    wk: workersInvocationsAdaptive(limit:1000, ${f(`date_geq:"${r2From}"`)}) { dimensions{ date status } sum{ requests errors } }
    r2: r2OperationsAdaptiveGroups(limit:2000, ${f(`date_geq:"${r2From}"`)}) { dimensions{ date actionType } sum{ requests } }
    r2s: r2StorageAdaptiveGroups(limit:50, orderBy:[datetime_DESC], ${f(`date_geq:"${day}"`)}) { dimensions{ bucketName datetime } max{ payloadSize metadataSize } }
  } } }`;
}

// Turns the GraphQL answer into plain numbers. `errors` entries carry the alias in their path; those datasets are reported as unavailable.
export function parseAnalytics(resp, day, periodStart = day.slice(0, 8) + "01") {
  const acct = resp && resp.data && resp.data.viewer && resp.data.viewer.accounts && resp.data.viewer.accounts[0];
  const missing = [];
  for (const e of (resp && resp.errors) || []) {
    const alias = (e.path || []).find((p) => DATASETS[p]);
    const msg = String(e.message || "").slice(0, 160);
    const perm = /authz|not authorized|permission|access/i.test(msg + JSON.stringify(e.extensions || {}));
    missing.push({ dataset: alias || "query", what: DATASETS[alias] || "analytics", message: msg, permission: perm ? "Account > Account Analytics > Read" : "" });
  }
  if (!acct) return { ok: false, missing, series: {}, now: {} };
  const bad = new Set(missing.map((m) => m.dataset));
  const days = Array.from({ length: 7 }, (_, i) => addDays(day, i - 6));
  const perDay = (rows, pick) => { const m = {}; for (const r of rows || []) { const d = r.dimensions.date; m[d] = (m[d] || 0) + (pick(r) || 0); } return m; };
  const asSeries = (m) => days.map((d) => ({ d, v: m[d] || 0 }));
  const series = {}, now = {}, month = {}, extra = {};
  const sumFrom = (m) => Object.entries(m).filter(([d]) => d >= periodStart && d <= day).reduce((s, [, v]) => s + v, 0); // billing month to date
  if (!bad.has("d1") && acct.d1) {
    const rd = perDay(acct.d1, (r) => r.sum.rowsRead), wr = perDay(acct.d1, (r) => r.sum.rowsWritten);
    series.d1_rows_read = asSeries(rd); series.d1_rows_written = asSeries(wr);
    month.d1_rows_read = sumFrom(rd); month.d1_rows_written = sumFrom(wr);
  }
  if (!bad.has("pf")) {
    const a = bad.has("pf") ? {} : perDay(acct.pf, (r) => r.sum.requests), b = bad.has("wk") ? {} : perDay(acct.wk, (r) => r.sum.requests);
    const all = {}; for (const m of [a, b]) for (const [d, v] of Object.entries(m)) all[d] = (all[d] || 0) + v;
    series.requests = asSeries(all); month.requests = sumFrom(all);
    const rows = [...(bad.has("pf") ? [] : acct.pf || []), ...(bad.has("wk") ? [] : acct.wk || [])].filter((r) => r.dimensions.date === day);
    const sumWhere = (fn) => rows.filter(fn).reduce((s, r) => s + (r.sum.requests || 0), 0);
    extra.cpu = { exceeded: sumWhere((r) => /exceeded/i.test(r.dimensions.status || "")), failed: sumWhere((r) => !/^(success|clientDisconnected|ok)$/i.test(r.dimensions.status || "")), requests: sumWhere(() => true) };
  }
  if (!bad.has("r2") && acct.r2) {
    const cls = (set) => perDay(acct.r2.filter((r) => set.has(r.dimensions.actionType)), (r) => r.sum.requests);
    const A = cls(R2_CLASS_A), B = cls(R2_CLASS_B);
    series.r2_class_a = asSeries(A); series.r2_class_b = asSeries(B);
    now.r2_class_a = month.r2_class_a = sumFrom(A); now.r2_class_b = month.r2_class_b = sumFrom(B); // R2 allowances are monthly on every plan
  }
  const latest = (rows, key, size) => { const seen = new Map(); for (const r of rows || []) if (!seen.has(r.dimensions[key])) seen.set(r.dimensions[key], size(r)); return [...seen.values()].reduce((s, v) => s + (v || 0), 0); };
  if (!bad.has("d1s") && acct.d1s && acct.d1s.length) now.d1_storage = latest(acct.d1s, "databaseId", (r) => r.max.databaseSizeBytes);
  if (!bad.has("r2s") && acct.r2s && acct.r2s.length) now.r2_storage = latest(acct.r2s, "bucketName", (r) => (r.max.payloadSize || 0) + (r.max.metadataSize || 0));
  for (const k of ["d1_rows_read", "d1_rows_written", "requests"]) if (series[k]) now[k] = (series[k].find((p) => p.d === day) || {}).v || 0;
  return { ok: true, missing, series, now, month, periodStart, ...extra };
}

// env.CF_GRAPHQL_URL exists only for local tests against a stub; never set it in production.
async function callCloudflare(env, day, periodStart) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(env.CF_GRAPHQL_URL || GRAPHQL, { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", authorization: "Bearer " + env.CF_ANALYTICS_TOKEN }, body: JSON.stringify({ query: buildQuery(env.CF_ACCOUNT_ID, day, periodStart) }) });
    const body = await res.json().catch(() => null);
    if (!res.ok && !body) return { ok: false, error: `Cloudflare answered ${res.status}.`, missing: [], series: {}, now: {} };
    const out = parseAnalytics(body, day, periodStart);
    if (!out.ok) {
      const first = (body && body.errors && body.errors[0] && body.errors[0].message) || `Cloudflare answered ${res.status}.`;
      const authz = /authz|not authorized|authentication|invalid|permission/i.test(String(first) + res.status);
      out.error = authz ? "Cloudflare refused the token or the account id. Check that the token has Account > Account Analytics > Read for this account and that CF_ACCOUNT_ID is the right account." : String(first).slice(0, 200);
    }
    return out;
  } catch (e) { return { ok: false, error: "Could not reach Cloudflare analytics (" + (e && e.name === "AbortError" ? "timed out" : "network error") + ").", missing: [], series: {}, now: {} }; }
  finally { clearTimeout(t); }
}

// The cloudflare part, cached in D1 for five minutes (one minute after a failure). `force` skips the cache.
async function cloudflarePart(env, day, periodStart, force) {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return { connected: false };
  let row = null;
  try { row = await env.DB.prepare("SELECT fetched_at, body FROM cf_usage_cache WHERE id = 1").first(); } catch {}
  if (row && !force) {
    const age = (Date.now() - Date.parse(row.fetched_at.replace(" ", "T") + "Z")) / 1000;
    try { const c = JSON.parse(row.body); if (c.day === day && c.periodStart === periodStart && age < (c.ok ? CACHE_SECONDS : 60)) return { connected: true, cached: true, fetchedAt: row.fetched_at, ...c }; } catch {}
  }
  const live = await callCloudflare(env, day, periodStart), at = sqlTime();
  const body = JSON.stringify({ ...live, day, periodStart });
  try { await env.DB.prepare("INSERT INTO cf_usage_cache (id, fetched_at, body) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET fetched_at = excluded.fetched_at, body = excluded.body").bind(at, body).run(); } catch {}
  return { connected: true, cached: false, fetchedAt: at, ...live, day, periodStart };
}

// Resend counts come from our own counter (site_hits, one row per UTC day), since Resend has no usage endpoint.
async function emailCounts(env, day) {
  const from = addDays(day, -6), month = day.slice(0, 7);
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT day, n FROM site_hits WHERE page = ? AND day >= ?").bind(EMAIL_KEY, from < month + "-01" ? from : month + "-01").all()).results; } catch {}
  const m = Object.fromEntries(rows.map((r) => [r.day, r.n]));
  return { m, today: m[day] || 0, month: rows.filter((r) => r.day.startsWith(month)).reduce((s, r) => s + r.n, 0), series: Array.from({ length: 7 }, (_, i) => { const d = addDays(day, i - 6); return { d, v: m[d] || 0 }; }) };
}

// Quota errors the site logged itself (ops_log kind 'limit'), newest first, last 24 hours
export async function limitHits(env, hours = 24) {
  try { return (await env.DB.prepare("SELECT created_at AS at, detail FROM ops_log WHERE kind = 'limit' AND created_at > ? ORDER BY id DESC LIMIT 20").bind(sqlTime(Date.now() - hours * 3600_000)).all()).results; } catch { return []; }
}

export async function getUsage(env, { force = false } = {}) {
  const day = utcDay(), plan = planOf(env), METRICS = metricsFor(plan), periodStart = periodStartFor(day, billingDayOf(env));
  const [cf, em, hits] = await Promise.all([cloudflarePart(env, day, periodStart, force), emailCounts(env, day), limitHits(env)]);
  const metrics = Object.entries(METRICS).map(([key, m]) => {
    const isEmail = key.startsWith("email_");
    let used = null, trend = null, today = null, unavailable = false, why = "";
    if (isEmail) { used = key === "email_day" ? em.today : em.month; trend = em.series; }
    else if (!cf.connected) { unavailable = true; why = "Not connected"; }
    else if (m.period === "month" && cf.month && cf.month[key] != null) { used = cf.month[key]; trend = (cf.series || {})[key] || null; today = trend ? (trend.find((p) => p.d === day) || {}).v ?? 0 : null; }
    else if (cf.now && cf.now[key] != null) { used = cf.now[key]; trend = (cf.series || {})[key] || null; }
    else { unavailable = true; const mm = (cf.missing || []).find((x) => x.dataset === DS_OF[key]); why = cf.error || (mm ? (mm.permission ? "Permission missing: " + mm.permission : mm.message) : "No data returned"); }
    const level = used == null ? "unknown" : levelFor(used, m.limit), ov = used == null ? { over: 0, usd: 0 } : overageFor(m, used);
    return { key, label: m.label, period: m.period, unit: m.unit, limit: m.limit, verified: m.verified, source: m.source, breaks: m.breaks, paid: m.paid, hardStop: m.hardStop, priceText: m.price ? m.price.text : "", used, today, pct: used == null ? null : Math.round((used / m.limit) * 1000) / 10, level, over: ov.over, overUsd: ov.usd, trend, unavailable, why };
  });
  const known = metrics.filter((x) => x.used != null).sort((a, b) => b.used / b.limit - a.used / a.limit);
  const top = known[0] || null;
  const level = known.reduce((w, x) => (LEVEL_RANK[x.level] > LEVEL_RANK[w] ? x.level : w), hits.some((h) => Date.parse(h.at.replace(" ", "T") + "Z") > Date.now() - 2 * 3600_000) ? "limit" : "ok"); // a logged quota error counts for two hours
  const overageUsd = Math.round(metrics.reduce((s, m) => s + m.overUsd, 0) * 100) / 100; // month-to-date estimate of the charges beyond the plan (R2, and on Workers Paid also D1 and requests)
  return {
    plan, planLabel: PLAN_LABELS[plan], planBaseUsd: plan === "paid" ? PAID_BASE_USD : 0, pricingVerified: PRICING_VERIFIED, periodStart, estimatedOverageUsd: overageUsd,
    utcDay: day, connected: !!cf.connected, cached: !!cf.cached, fetchedAt: cf.fetchedAt || null, error: cf.connected && !cf.ok ? cf.error || "Could not read Cloudflare analytics." : "",
    missing: cf.missing || [], cpu: cf.cpu || null, metrics, top: top && { key: top.key, label: top.label, pct: top.pct, level: top.level },
    level, limitHits: hits, thresholds: THRESHOLDS,
  };
}

// Plain-text lines for the digest and the check endpoint: metrics at or above the watch level, plus the top one.
// A hard-stop metric at 100% says LIMIT REACHED; a billed one says EXTRA CHARGES START (and the estimated cost) because the site keeps working.
export function usageLines(u) {
  const when = (m) => (m.period === "month" ? " this month" : "");
  const usd = (n) => (n > 0 && n < 0.01 ? "under USD 0.01" : "USD " + n.toFixed(2));
  const fmt = (m) => `${m.label}: ${m.used.toLocaleString("en-US")} of ${m.limit.toLocaleString("en-US")}${m.hardStop === false && m.period !== "now" ? " included" + when(m) : ""} (${m.pct}%)${m.level === "limit" ? (m.hardStop === false ? ` EXTRA CHARGES START (about ${usd(m.overUsd)} so far, the site keeps working)` : " LIMIT REACHED") : m.level === "warning" ? " WARNING" : m.level === "watch" ? " watch" : ""}`;
  const list = u.metrics.filter((m) => m.used != null && m.level !== "ok");
  const top = u.metrics.filter((m) => m.used != null).sort((a, b) => b.used / b.limit - a.used / a.limit)[0];
  if (top && !list.includes(top)) list.push(top);
  return list.sort((a, b) => b.used / b.limit - a.used / a.limit).map(fmt);
}
