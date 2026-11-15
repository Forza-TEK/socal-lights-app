// Admin > From Grok (behind requireAdmin through functions/api/admin/_middleware.js).
// GET  /api/admin/grok            -> { configured, publishing, counts, rows: [recent intake rows] }
// POST /api/admin/grok { action: "unpublish" | "publish" | "remove_photo", id }   or, for update rows (id starts "gu-"), { action: "update_revert" | "update_apply" | "update_dismiss", id }   one click: take a Grok event off the map (the row stays, so Grok cannot add it again), or put a held / unpublished one on it.
import { json, err } from "../../_lib/util.js";
import { eventStatement, publishingOn, ID_PREFIX, intakeId, checkImage, loadRemovals, removedHome, REMOVED_REASON } from "../../_lib/intake.js";
import { geocodeAddress, nearestCounty } from "../../_lib/util.js";
import { isDate } from "../../_lib/events.js";
import { normalizeHours } from "../../../scripts/event-rules.mjs";
import { CITY } from "../../../public/cities.js";
import { SEASONS } from "../../../public/seasons.js";
import { refundDueStatements, restoreRefundDue } from "../../_lib/orders.js";
import { applyStatement, snapOf } from "../../_lib/intake-updates.js";

export async function onRequestGet({ env }) {
  const rows = (await env.DB.prepare("SELECT id, status, reason, name, city, county, season, type, start_date, end_date, hours, price, url, venue, address, evidence, seen, image, received_at, acted_at FROM intake_events ORDER BY received_at DESC, id LIMIT 300").all()).results;
  const updates = (await env.DB.prepare("SELECT id, event_id, event_name, status, kind, reason, before, after, url, evidence, seen, received_at, acted_at FROM intake_updates ORDER BY received_at DESC, id LIMIT 300").all()).results;
  const counts = {}; for (const r of (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM intake_events GROUP BY status").all()).results) counts[r.status] = r.n;
  return json({ updates, configured: !!(env.GROK_INTAKE_KEY && String(env.GROK_INTAKE_KEY).length >= 16), publishing: publishingOn(env), counts, rows }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (b && typeof b.id === "string" && b.id.startsWith("gu-")) return updateAction(env, b);
  if (!b || typeof b.id !== "string" || !/^grokx?-/.test(b.id)) return err(400, "Choose a Grok event.");
  const row = await env.DB.prepare("SELECT * FROM intake_events WHERE id = ?").bind(b.id).first();
  if (!row) return err(404, "That row is gone.");
  if (b.action === "unpublish") {
    if (row.status !== "published") return err(409, "That event is not published.");
    await env.DB.batch([
      ...refundDueStatements(env.DB, { events: [row.id] }, "The event was unpublished while a paid placement was running. Refund it in the Stripe dashboard, then mark it refunded here.", { restorable: true }),
      env.DB.prepare("DELETE FROM events WHERE id = ? AND id LIKE 'grok-%'").bind(row.id),
      env.DB.prepare("UPDATE intake_events SET status = 'unpublished', acted_at = datetime('now') WHERE id = ?").bind(row.id),
    ]);
    return json({ ok: true, status: "unpublished" });
  }
  if (b.action === "publish") {
    if (!["held", "unpublished", "rejected"].includes(row.status)) return err(409, "Only a held, unpublished or rejected row can be published.");
    if (removedHome(await loadRemovals(env), row)) return err(409, "Cannot publish: " + REMOVED_REASON + ".");
    if (row.status === "rejected") { // the owner overrides the checks: the row is made complete (pin looked up, county and id worked out) and must still be a real, dated event with a known city, season and type
      const miss = [];
      if (String(row.name || "").trim().length < 4) miss.push("a name");
      if (!CITY[row.city]) miss.push(`a city from our list (it says "${row.city}")`);
      if (!SEASONS[row.season] || !SEASONS[row.season].types[row.type]) miss.push("a valid season and type");
      if (!isDate(row.start_date) || !isDate(row.end_date) || row.end_date < row.start_date) miss.push("real start and end dates");
      if (miss.length) return err(409, "This row cannot be published as it is: it is missing " + miss.join(", ") + ". Ask Grok to send it again with those fixed.");
      const id = await intakeId(row.name, row.start_date, row.city);
      const dup = await env.DB.prepare("SELECT id FROM events WHERE id = ? OR (lower(name) = lower(?) AND start_date = ?) LIMIT 1").bind(id, row.name, row.start_date).first();
      if (dup) return err(409, "An event with this name and date is already on the map.");
      let lat = row.lat, lng = row.lng, note = "Published by the owner after the checks rejected it: " + String(row.reason || "").slice(0, 300);
      if (lat == null || lng == null) {
        const pt = row.address ? await geocodeAddress(row.address, row.city, CITY[row.city], ["Los Angeles", "San Diego"].includes(row.city) ? 45 : 30) : null;
        if (pt) [lat, lng] = pt; else { [lat, lng] = CITY[row.city]; note += " (pin is at the city center: the address was not found)"; }
      }
      const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
      const x = { ...row, id, hours: normalizeHours(row.hours || ""), price: row.price || (row.free ? "Free" : "Price not listed"), lat, lng, county: nearestCounty(lat, lng, evs), image: (await checkImage(row.image, row)).image };
      await env.DB.batch([
        eventStatement(env, x),
        env.DB.prepare("DELETE FROM intake_events WHERE id = ?").bind(row.id),
        env.DB.prepare("INSERT OR REPLACE INTO intake_events (id,status,reason,name,county,city,season,type,start_date,end_date,hours,free,price,blurb,url,venue,address,lat,lng,evidence,seen,image,received_at,acted_at) VALUES (?,'published',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))").bind(id, note.slice(0, 500), x.name, x.county, x.city, x.season, x.type, x.start_date, x.end_date, x.hours, x.free ? 1 : 0, x.price, x.blurb || "", x.url || "", x.venue || "", x.address || "", lat, lng, x.evidence || "", x.seen || "", x.image, row.received_at),
      ]);
      return json({ ok: true, status: "published", id });
    }
    await env.DB.batch([eventStatement(env, row), env.DB.prepare("UPDATE intake_events SET status = 'published', acted_at = datetime('now') WHERE id = ?").bind(row.id)]);
    await restoreRefundDue(env.DB, { events: [row.id] });
    return json({ ok: true, status: "published" });
  }
  if (b.action === "remove_photo") { // the event stays; only the linked photo goes (the card falls back to its stock photo)
    await env.DB.batch([
      env.DB.prepare("UPDATE events SET image = NULL, updated_at = datetime('now') WHERE id = ? AND id LIKE 'grok-%' AND image = ?").bind(row.id, row.image || ""),
      env.DB.prepare("UPDATE intake_events SET image = '', acted_at = datetime('now') WHERE id = ?").bind(row.id),
    ]);
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}

// Update rows: undo an applied change, apply a held one, or dismiss a held one. A change is only undone or applied while the event still has the values it had at that moment.
async function updateAction(env, b) {
  const u = await env.DB.prepare("SELECT * FROM intake_updates WHERE id = ?").bind(b.id).first();
  if (!u) return err(404, "That update is gone.");
  const ev = await env.DB.prepare("SELECT start_date, end_date, hours, price, free, status, image FROM events WHERE id = ?").bind(u.event_id).first();
  const before = JSON.parse(u.before || "{}"), after = JSON.parse(u.after || "{}"), same = (x) => ev && JSON.stringify(snapOf(ev)) === JSON.stringify(x);
  const mark = (status) => env.DB.prepare("UPDATE intake_updates SET status = ?, acted_at = datetime('now') WHERE id = ?").bind(status, u.id);
  if (b.action === "update_revert") {
    if (u.status !== "applied") return err(409, "Only an applied update can be undone.");
    if (!ev) return err(409, "That event is no longer on the map.");
    if (!same(after)) return err(409, "The event was changed again after this update, so it cannot be undone from here. Edit the event instead.");
    await env.DB.batch([applyStatement(env, u.event_id, before), mark("reverted")]);
    return json({ ok: true, status: "reverted" });
  }
  if (b.action === "update_apply") {
    if (u.status !== "held") return err(409, "Only a held update can be applied.");
    if (u.kind === "cancelled") return err(409, "A cancellation is not applied from here. Open the event in Events and unpublish or edit it yourself, then dismiss this.");
    if (!ev) return err(409, "That event is no longer on the map.");
    if (!same(before)) return err(409, "The event was changed after this update arrived, so it was not applied. Dismiss it.");
    await env.DB.batch([applyStatement(env, u.event_id, after), mark("applied")]);
    return json({ ok: true, status: "applied" });
  }
  if (b.action === "update_dismiss") {
    if (u.status !== "held") return err(409, "Only a held update can be dismissed.");
    await env.DB.batch([mark("dismissed")]);
    return json({ ok: true, status: "dismissed" });
  }
  return err(400, "Unknown action.");
}
