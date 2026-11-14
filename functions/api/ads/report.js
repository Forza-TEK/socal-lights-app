// POST /api/ads/report { rows: [{ ad_id, campaign, status, spend_cents, impressions, clicks, disapproval_reason?, as_of }] }   (1 to 100 rows)
// Grok reports the latest numbers per ad (lifetime spend so far). All rows are validated first: one bad row rejects the whole call (400 with every problem listed) and nothing is stored.
// Stores the latest row per ad in ads_reports and appends to ads_report_log (pruned after 90 days). Answers { ok, accepted, skipped, totals, warnings }.
import { adsGuard, adsError, reply, loadAds, computeWarnings, summarize, validateRow, canonicalAdId, cleanReason, nowIso, normAsOf, MAX_ROWS, MAX_ADS_STORED, LOG_KEEP_DAYS } from "../../_lib/ads.js";
import { logOp } from "../../_lib/oplog.js";

export async function onRequest({ request, env }) {
  const g = await adsGuard(request, env, "POST");
  if (g.res) return g.res;
  const raw = await request.text().catch(() => "");
  if (raw.length > 65536) return adsError(413, "Body too large (64 KB at most). Send at most 100 rows.");
  let b = null; try { b = JSON.parse(raw); } catch {}
  if (!b || typeof b !== "object" || Array.isArray(b) || !Array.isArray(b.rows)) return adsError(400, 'Send JSON like { "rows": [ { "ad_id", "campaign", "status", "spend_cents", "impressions", "clicks", "as_of" } ] }.');
  if (!b.rows.length || b.rows.length > MAX_ROWS) return adsError(400, `Send between 1 and ${MAX_ROWS} rows per call (got ${b.rows.length}).`);
  for (const k of Object.keys(b)) if (k !== "rows") return adsError(400, `Unknown field "${k}". Only "rows" is allowed.`);
  // Grok names the ads ct-a, ev-a, in-a...; the approved ids are ct-a-meta, ev-a-meta, in-a-meta... A short name that matches exactly one approved id is stored under that id.
  const cur = await loadAds(env), known = new Set(cur.items.map((i) => i.id));
  const rows = b.rows.map((r) => (r && typeof r.ad_id === "string" ? { ...r, ad_id: canonicalAdId(r.ad_id, known) } : r));
  const now = Date.now(), errors = [];
  rows.forEach((r, i) => errors.push(...validateRow(r, i, now)));
  const seen = new Set();
  rows.forEach((r, i) => { if (r && typeof r.ad_id === "string") { if (seen.has(r.ad_id)) errors.push(`row ${i}: ad_id ${r.ad_id} appears twice in this call`); seen.add(r.ad_id); } });
  if (errors.length) return adsError(400, "Nothing was stored. Fix these and send the whole batch again.", { errors: errors.slice(0, 50), error_count: errors.length });

  const item = new Map(cur.items.map((i) => [i.id, i])), have = new Map(cur.reports.map((r) => [r.ad_id, r]));
  const problems = [];
  rows.forEach((r, i) => { const it = item.get(r.ad_id); if (it && it.audience !== r.campaign) problems.push(`row ${i}: ${r.ad_id} belongs to campaign ${it.audience}, not ${r.campaign}`); });
  const fresh = rows.filter((r) => !have.has(r.ad_id)).length;
  if (have.size + fresh > MAX_ADS_STORED) problems.push(`too many different ad ids (limit ${MAX_ADS_STORED}); report only ads from the brief`);
  if (problems.length) return adsError(400, "Nothing was stored. Fix these and send the whole batch again.", { errors: problems, error_count: problems.length });

  const receivedAt = nowIso(now), skipped = [], st = [];
  let accepted = 0;
  for (const r of rows) {
    const asOf = normAsOf(r.as_of), prev = have.get(r.ad_id);
    if (prev && asOf < prev.as_of) { skipped.push({ ad_id: r.ad_id, reason: `older than the stored report (${prev.as_of}); kept the newer one` }); continue; }
    const vals = [r.ad_id, r.campaign, r.status, r.spend_cents, r.impressions, r.clicks, cleanReason(r.disapproval_reason), asOf, receivedAt];
    st.push(env.DB.prepare("INSERT INTO ads_reports (ad_id, campaign, status, spend_cents, impressions, clicks, disapproval_reason, as_of, received_at, ad_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ad_id) DO UPDATE SET campaign = excluded.campaign, status = excluded.status, spend_cents = excluded.spend_cents, impressions = excluded.impressions, clicks = excluded.clicks, disapproval_reason = excluded.disapproval_reason, as_of = excluded.as_of, received_at = excluded.received_at, ad_url = COALESCE(NULLIF(excluded.ad_url, ''), ads_reports.ad_url)").bind(...vals, r.ad_url || ""));
    st.push(env.DB.prepare("INSERT INTO ads_report_log (ad_id, campaign, status, spend_cents, impressions, clicks, disapproval_reason, as_of, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...vals));
    accepted++;
  }
  st.push(env.DB.prepare("DELETE FROM ads_report_log WHERE received_at < ?").bind(nowIso(now - LOG_KEEP_DAYS * 86400_000)));
  try { await env.DB.batch(st); }
  catch (e) { await logOp(env, "ads", "report failed (" + String(e && e.message).slice(0, 80) + ")"); return adsError(503, "Could not save the report. Nothing was stored; retry in a minute."); }

  const all = await loadAds(env), warnings = computeWarnings(all, now);
  // a spend that went down is odd (lifetime spend only grows): say so, still stored
  for (const r of rows) { const p = have.get(r.ad_id); if (p && r.spend_cents < p.spend_cents) warnings.push({ code: "spend_decreased", message: `Ad ${r.ad_id} reported lower lifetime spend than before (${p.spend_cents} then ${r.spend_cents} cents). Check the numbers.`, ad_id: r.ad_id }); }
  await logOp(env, "ads", `report rows=${rows.length} accepted=${accepted} warnings=${warnings.length}`);
  return reply(200, { ok: true, accepted, skipped, received_at: receivedAt, totals: summarize(all).totals, warnings });
}
