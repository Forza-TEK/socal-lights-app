// POST /api/intake/updates { rows: [ { id, url, shows, evidence, seen, start?, end?, hours?, price?, free?, image_url?, cancelled? } ], dry_run? }   (1 to 8 rows)
// Key-protected (Authorization: Bearer GROK_INTAKE_KEY), like /api/intake/events. For events already on the map: confirm them and correct dates, hours, price or the photo link from the event's own page.
// Each row is answered applied, held (the owner decides), unchanged or rejected, with reasons. Applied changes can be undone in Admin > From Grok > Updates. Details: docs/monetization/grok-browser-pass.md.
import { intakeGuard, publishingOn } from "../../_lib/intake.js";
import { processUpdates, MAX_UPDATES } from "../../_lib/intake-updates.js";
import { reply, adsError } from "../../_lib/ads.js";
import { logOp } from "../../_lib/oplog.js";

export async function onRequest({ request, env }) {
  const g = await intakeGuard(request, env, "POST");
  if (g.res) return g.res;
  const raw = await request.text().catch(() => "");
  if (raw.length > 65536) return adsError(413, "Body too large (64 KB at most).");
  let b = null; try { b = JSON.parse(raw); } catch {}
  if (!b || typeof b !== "object" || Array.isArray(b) || !Array.isArray(b.rows)) return adsError(400, 'Send JSON like { "rows": [ { "id", "url", "shows", "evidence", "seen", "start", "end", "hours" } ] }.');
  if (!b.rows.length || b.rows.length > MAX_UPDATES) return adsError(400, `Send between 1 and ${MAX_UPDATES} rows per call (got ${b.rows.length}).`);
  for (const k of Object.keys(b)) if (k !== "rows" && k !== "dry_run") return adsError(400, `Unknown field "${k}". Only "rows" and "dry_run" are allowed.`);
  try {
    const out = await processUpdates(env, b.rows, { dryRun: b.dry_run === true });
    return reply(200, { ok: true, dry_run: b.dry_run === true, publishing: publishingOn(env), ...out });
  } catch (e) {
    await logOp(env, "grok-updates", String(e && e.message || e));
    return adsError(500, "The update call could not finish. Send the same rows again in a minute.");
  }
}
