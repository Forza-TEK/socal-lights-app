// Ads link: what Grok (which builds the Facebook and Instagram ads in Meta Ads Manager) may read from the site and report back (docs/monetization/grok-ads-api.md).
//
// Read-only for ad copy: copy and status live in ads_items and change only by a new migration. Grok reports status, spend and counts per ad; nothing personal is ever stored.
// Same key style as the outreach API: Bearer secret ADS_API_KEY, constant-time compare, 60 requests a minute per key (the counter shares the outreach_rate table under its own key id).
import { sha256 } from "./auth.js";
import { ptToday, ptDate } from "./time.js";

export const TOTAL_BUDGET_CENTS = 30000, LOADED_BUDGET_CENTS = 28000, RESERVE_CENTS = 2000;
export const HARD_END = "2026-12-08"; // every ad ends by this date (Pacific Time)
export const RATE_PER_MIN = 60, MAX_ROWS = 100, STALE_HOURS = 48, LOG_KEEP_DAYS = 90;
export const STATUSES = ["draft", "in_review", "active", "paused", "disapproved", "ended"];
export const ITEM_STATUSES = ["approved", "hold", "rejected", "not_in_launch"];
export const AUDIENCES = ["contest_organizers", "event_holders", "installers", "families", "homeowners"];
export const COUNTIES = ["Los Angeles", "Orange", "San Diego", "Riverside", "San Bernardino", "Ventura", "Santa Barbara"];
export const FIELDS = ["ad_id", "campaign", "status", "spend_cents", "impressions", "clicks", "disapproval_reason", "as_of"];
const MAX_SPEND = 5_000_000, MAX_COUNT = 2_000_000_000, MAX_ADS_STORED = 100;

export const RULES = [
  "Facebook and Instagram (Meta) only. Do not create anything in Google Ads, Nextdoor or anywhere else.",
  "Use ONLY the copy in this brief, word for word. No new ad copy, claims, prices or images. Say 'home', never 'house' or 'display'.",
  "Total ad budget is $300: $280 is loaded across the campaigns below and $20 is a reserve that is never loaded. Set the Meta account spending limit to $280.",
  "Every ad ends by Dec 8, 2026 (Pacific Time). Use a lifetime budget with an end date per ad set, equal to the campaign budget and dates below.",
  "Target by county only: " + COUNTIES.join(", ") + ". No city or ZIP targeting.",
  "Never create or change a budget, a payment method or a card without the owner. Stop and ask the owner before Publish, Submit for review, Confirm or Turn on.",
  "If an ad is disapproved, an identity check or a policy flag appears, stop and tell the owner. Report it with status disapproved.",
  "Do not edit the landing links: they already carry the tracking codes (ref and utm).",
  "Report every 2 days with POST /api/ads/report. Reports hold counts and status only: no names, emails, comments or audience details.",
];

export const reply = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", ...headers } });
export const adsError = (status, error, extra = {}) => reply(status, { ok: false, error, ...extra });

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]); // equal length digests, compared without stopping at the first difference
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

// Returns { res } (a Response to send back as is) or { keyId } when the call may go on.
//   no secret (or a too short one): 503; no / wrong Authorization: 401; more than 60 calls this minute: 429; the rate-limit write failed: 503.
export async function adsGuard(request, env, method = "GET") {
  const secret = env.ADS_API_KEY;
  if (!secret || String(secret).length < 16) return { res: adsError(503, "The ads link is not set up (ADS_API_KEY is missing). Ask the owner.") };
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("authorization") || "");
  if (!m || !(await sameSecret(m[1], secret))) return { res: adsError(401, "Not allowed. Send the header Authorization: Bearer <ADS_API_KEY>.") };
  if (request.method !== method && !(method === "GET" && request.method === "HEAD")) return { res: adsError(405, `Use ${method} on this endpoint.`) };
  const keyId = (await sha256("ads|" + secret)).slice(0, 8), minute = Math.floor(Date.now() / 60000);
  try {
    const r = await env.DB.batch([
      env.DB.prepare("INSERT INTO outreach_rate (bucket, n) VALUES (?, 1) ON CONFLICT(bucket) DO UPDATE SET n = n + 1").bind(`${keyId}:${minute}`),
      env.DB.prepare("SELECT n FROM outreach_rate WHERE bucket = ?").bind(`${keyId}:${minute}`),
      env.DB.prepare("DELETE FROM outreach_rate WHERE CAST(substr(bucket, 10) AS INTEGER) < ?").bind(minute - 5),
    ]);
    if (r[1].results[0].n > RATE_PER_MIN) return { res: reply(429, { ok: false, error: `At most ${RATE_PER_MIN} requests a minute. Wait and retry.` }, { "retry-after": "30" }) };
  } catch { return { res: adsError(503, "Could not check the rate limit. Retry in a minute.") }; }
  return { keyId };
}

// ---------- data ----------
export async function loadAds(env) {
  const [campaigns, items, reports] = (await env.DB.batch([
    env.DB.prepare("SELECT audience, name, budget_cents, starts, ends, wave, daily_hint_cents FROM ads_campaigns ORDER BY wave, starts, audience"),
    env.DB.prepare("SELECT * FROM ads_items ORDER BY wave = 0, wave, audience, id"),
    env.DB.prepare("SELECT ad_id, campaign, status, spend_cents, impressions, clicks, disapproval_reason, as_of, received_at FROM ads_reports ORDER BY ad_id"),
  ])).map((r) => r.results);
  return { campaigns, items, reports };
}
export const refOf = (url) => { try { return new URL(url).searchParams.get("ref") || ""; } catch { return ""; } };

// A short list of the creative files in /ad-assets/manifest.json (written by scripts/build-ad-assets.mjs). Missing or unreadable: an empty list.
export async function loadManifest(env, request) {
  try {
    if (!env.ASSETS) return [];
    const res = await env.ASSETS.fetch(new Request(new URL("/ad-assets/manifest.json", request.url)));
    if (!res.ok) return [];
    const m = await res.json();
    return Array.isArray(m && m.files) ? m.files.filter((f) => f && typeof f.path === "string" && typeof f.asset_id === "string") : [];
  } catch { return []; }
}
export const fileOut = (f, origin) => ({ asset_id: f.asset_id, path: f.path, url: `${origin}/ad-assets/${f.path.split("/").map(encodeURIComponent).join("/")}`, content_type: f.content_type || "", bytes: f.bytes || 0, sha256: f.sha256 || "", width: f.width || null, height: f.height || null, duration_s: f.duration_s || null, ratio: f.ratio || "" });

// ---------- warnings ----------
// Pure: the same rules for the report response, the status endpoint and the admin tab.
//   over_total_budget / over_loaded_budget : total reported spend above $300 / $280
//   campaign_over_budget                   : one audience campaign spent more than its budget
//   not_in_launch_set                      : a reported ad is not an approved launch-set ad
//   active_after_dec8                      : an ad is active and the report date or today is after Dec 8, 2026
//   past_campaign_end                      : an ad is active after its own campaign end date (e.g. installers end Nov 23)
//   disapproved                            : an ad is disapproved
//   stale_report                           : no report in 48 hours while ads are due to run
export function computeWarnings({ campaigns, items, reports }, now = Date.now()) {
  const w = [], add = (code, message, extra = {}) => w.push({ code, message, ...extra });
  const launch = new Map(items.filter((i) => i.status === "approved").map((i) => [i.id, i]));
  const camp = new Map(campaigns.map((c) => [c.audience, c]));
  const today = ptDate(now), total = reports.reduce((s, r) => s + r.spend_cents, 0);
  const usd = (c) => "$" + (c / 100).toFixed(2);
  if (total > TOTAL_BUDGET_CENTS) add("over_total_budget", `Reported spend ${usd(total)} is over the $300 total ad budget. Pause every ad and tell the owner.`, { spend_cents: total, limit_cents: TOTAL_BUDGET_CENTS });
  else if (total > LOADED_BUDGET_CENTS) add("over_loaded_budget", `Reported spend ${usd(total)} is over the $280 loaded amount (the Meta account limit). Pause and tell the owner.`, { spend_cents: total, limit_cents: LOADED_BUDGET_CENTS });
  const by = {};
  for (const r of reports) by[r.campaign] = (by[r.campaign] || 0) + r.spend_cents;
  for (const [a, s] of Object.entries(by)) { const c = camp.get(a); if (c && s > c.budget_cents) add("campaign_over_budget", `Campaign ${a} spent ${usd(s)}, over its ${usd(c.budget_cents)} budget.`, { campaign: a, spend_cents: s, limit_cents: c.budget_cents }); }
  for (const r of reports) {
    const it = launch.get(r.ad_id), asDay = String(r.as_of).slice(0, 10), end = it ? it.ends : HARD_END;
    if (!it) add("not_in_launch_set", `Ad ${r.ad_id} is not in the approved launch set. Do not run it.`, { ad_id: r.ad_id });
    if (r.status === "disapproved") add("disapproved", `Ad ${r.ad_id} is disapproved${r.disapproval_reason ? ": " + r.disapproval_reason : ""}. Stop and tell the owner.`, { ad_id: r.ad_id });
    if (r.status === "active") {
      if (asDay > HARD_END || today > HARD_END) add("active_after_dec8", `Ad ${r.ad_id} is active after Dec 8, 2026. Pause it now.`, { ad_id: r.ad_id });
      else if (asDay > end || today > end) add("past_campaign_end", `Ad ${r.ad_id} is active after its campaign end date ${end}. Pause it.`, { ad_id: r.ad_id, ends: end });
    }
  }
  // 48 hours without a report, once ads are due to run (first campaign starts Nov 12) and until two days after the hard end
  const first = campaigns.reduce((m, c) => (c.starts < m ? c.starts : m), "9999-99-99");
  const last = reports.reduce((m, r) => (r.received_at > m ? r.received_at : m), "");
  const lastMs = last ? Date.parse(last) : 0, startMs = Date.parse(first + "T08:00:00Z"); // 08:00 UTC is midnight Pacific
  const live = reports.length === 0 || reports.some((r) => r.status !== "ended");
  if (live && first !== "9999-99-99" && today >= first && today <= "2026-12-10" && now - Math.max(lastMs, startMs) > STALE_HOURS * 3600_000)
    add("stale_report", last ? `No report in ${Math.floor((now - lastMs) / 3600_000)} hours (last ${last}). Grok should report every 2 days.` : "No report received yet and the first campaign has started.", { last_report_at: last || null });
  return w;
}

export function summarize({ campaigns, items, reports }) {
  const rep = new Map(reports.map((r) => [r.ad_id, r]));
  const per = campaigns.map((c) => {
    const ads = items.filter((i) => i.audience === c.audience && i.status === "approved").map((i) => i.id);
    const spend = reports.filter((r) => r.campaign === c.audience).reduce((s, r) => s + r.spend_cents, 0);
    return { audience: c.audience, name: c.name, budget_cents: c.budget_cents, spend_cents: spend, starts: c.starts, ends: c.ends, wave: c.wave, ads, reported_ads: ads.filter((a) => rep.has(a)).length };
  });
  const sum = (k) => reports.reduce((s, r) => s + r[k], 0);
  return { campaigns: per, totals: { spend_cents: sum("spend_cents"), impressions: sum("impressions"), clicks: sum("clicks"), budget_cents: TOTAL_BUDGET_CENTS, loaded_cents: LOADED_BUDGET_CENTS, reserve_cents: RESERVE_CENTS, campaign_budget_cents: campaigns.reduce((s, c) => s + c.budget_cents, 0) } };
}

// ---------- validation of one report row ----------
const intIn = (v, max) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
export function validateRow(r, i, now = Date.now()) {
  const e = [], bad = (m) => e.push(`row ${i}: ${m}`);
  if (!r || typeof r !== "object" || Array.isArray(r)) return [`row ${i}: must be an object with ${FIELDS.join(", ")}`];
  for (const k of Object.keys(r)) if (!FIELDS.includes(k)) bad(`unknown field "${k}" (allowed: ${FIELDS.join(", ")}). Send counts and status only, nothing personal`);
  if (typeof r.ad_id !== "string" || !/^[a-z0-9-]{3,40}$/.test(r.ad_id)) bad("ad_id must be the id from the brief, e.g. ct-a-meta (lowercase letters, digits, hyphens, 3 to 40 characters)");
  if (!AUDIENCES.includes(r.campaign)) bad(`campaign must be one of ${AUDIENCES.join(", ")}`);
  if (!STATUSES.includes(r.status)) bad(`status must be one of ${STATUSES.join(", ")}`);
  if (!intIn(r.spend_cents, MAX_SPEND)) bad(`spend_cents must be a whole number of cents from 0 to ${MAX_SPEND} (lifetime spend so far, not today's)`);
  if (!intIn(r.impressions, MAX_COUNT)) bad("impressions must be a whole number from 0");
  if (!intIn(r.clicks, MAX_COUNT)) bad("clicks must be a whole number from 0");
  else if (intIn(r.impressions, MAX_COUNT) && r.clicks > r.impressions) bad("clicks cannot be more than impressions");
  if (r.disapproval_reason !== undefined) {
    if (typeof r.disapproval_reason !== "string" || r.disapproval_reason.length > 300) bad("disapproval_reason must be text up to 300 characters");
    else if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(r.disapproval_reason) || /\d{3}[-.\s)]*\d{3}[-.\s]*\d{4}/.test(r.disapproval_reason)) bad("disapproval_reason must not contain an email address or phone number");
  }
  if (r.status === "disapproved" && !String(r.disapproval_reason || "").trim()) bad("status disapproved needs a disapproval_reason (Meta's wording is fine)");
  const t = typeof r.as_of === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2}))?$/.test(r.as_of) ? Date.parse(r.as_of.length === 10 ? r.as_of + "T12:00:00Z" : r.as_of) : NaN;
  if (Number.isNaN(t)) bad("as_of must be a date (2026-11-14) or an ISO time with a zone (2026-11-14T09:30:00-08:00)");
  else if (t > now + 36 * 3600_000) bad("as_of is in the future");
  else if (t < now - 60 * 86400_000) bad("as_of is more than 60 days old");
  return e;
}
export const cleanReason = (s) => String(s || "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 300);
export const nowIso = (now = Date.now()) => new Date(now).toISOString().replace(/\.\d+Z$/, "Z");
export const normAsOf = (s) => new Date(s.length === 10 ? s + "T12:00:00Z" : s).toISOString().replace(/\.\d+Z$/, "Z");
export { MAX_ADS_STORED, ptToday };
