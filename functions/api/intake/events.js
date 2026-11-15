// POST /api/intake/events { rows: [ {name, city, season, type, start, end, hours, free, price, blurb, url, venue, address, shows, evidence, seen} ], dry_run? }   (1 to 8 rows)
// Key-protected (Authorization: Bearer GROK_INTAKE_KEY). Every row is checked with the sweeps' rules; the answer gives each row's verdict: published, held, duplicate or rejected (with reasons).
// A bad row never blocks the good ones. dry_run: true runs every check and stores nothing. Details: docs/monetization/grok-browser-pass.md.
import { intakeGuard, processRows, publishingOn, MAX_ROWS } from "../../_lib/intake.js";
import { reply, adsError } from "../../_lib/ads.js";
import { logOp } from "../../_lib/oplog.js";

export async function onRequest({ request, env }) {
  const g = await intakeGuard(request, env, "POST");
  if (g.res) return g.res;
  const raw = await request.text().catch(() => "");
  if (raw.length > 65536) return adsError(413, "Body too large (64 KB at most).");
  let b = null; try { b = JSON.parse(raw); } catch {}
  if (!b || typeof b !== "object" || Array.isArray(b) || !Array.isArray(b.rows)) return adsError(400, 'Send JSON like { "rows": [ { "name", "city", "season", "type", "start", "end", "hours", "free", "price", "blurb", "url", "venue", "address", "shows", "evidence", "seen" } ] }.');
  if (!b.rows.length || b.rows.length > MAX_ROWS) return adsError(400, `Send between 1 and ${MAX_ROWS} rows per call (got ${b.rows.length}). Send more events in more calls.`);
  for (const k of Object.keys(b)) if (k !== "rows" && k !== "dry_run") return adsError(400, `Unknown field "${k}". Only "rows" and "dry_run" are allowed.`);
  try {
    const out = await processRows(env, b.rows, { dryRun: b.dry_run === true });
    return reply(200, { ok: true, dry_run: b.dry_run === true, publishing: publishingOn(env), ...out });
  } catch (e) {
    await logOp(env, "grok-intake", String(e && e.message || e));
    return adsError(500, "The intake could not finish. Nothing from this call is lost track of: send the same rows again in a minute.");
  }
}
