// "Remove my home" requests (PL-01).
// GET  /api/admin/removals                      open requests first, with the listing each one points at (or address matches when the resident gave no id)
// POST /api/admin/removals { id, action: "approve", target?, nothing? }   approve = delete the listing, mark done, email the requester
//      /api/admin/removals { id, action: "decline", reason? }              decline = mark declined, email the requester
// `target` ("event:<id>" or "post:<id>") picks the listing when the request had none or Admin found a better match; `nothing: true` closes a request when there is nothing to remove.
import { json, err, clean } from "../../_lib/util.js";
import { tell } from "../../_lib/notify.js";
import { resolveRef, candidatesFor, removeListing } from "../../_lib/removal.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM removal_requests ORDER BY (status = 'open') DESC, created_at DESC LIMIT 100").all().catch(() => ({ results: [] }));
  const out = [];
  for (const r of results.slice(0, 40)) { // 40 rows × 2 lookups stays far below the 50-calls-per-request cap
    let listing = null, matches = [];
    if (r.status === "open") {
      const t = r.ref ? await resolveRef(env, r.ref) : null;
      if (t) {
        const row = t.row;
        let consent = null;
        if (t.kind === "post" && row.consent_id) consent = await env.DB.prepare("SELECT email, n, version, created_at FROM home_consents WHERE id = ?").bind(row.consent_id).first();
        listing = { target: `${t.kind}:${row.id}`, kind: t.kind, name: row.name || row.title || "", city: row.city || "", address: row.address || "", contest: !!row.contest_id, addedBy: !!row.added_by, consent };
      } else matches = await candidatesFor(env, r.address);
    }
    out.push({ id: r.id, ref: r.ref, address: r.address, email: r.email, note: r.note, status: r.status, target: r.target, adminNote: r.admin_note, createdAt: r.created_at, handledAt: r.handled_at, listing, matches });
  }
  return json(out, { headers: { "cache-control": "no-store" } });
}

async function addressOf(env, target) {
  const [kind, ...rest] = String(target || "").split(":"), id = rest.join(":");
  if (kind === "event") { const e = await env.DB.prepare("SELECT address, city FROM events WHERE id = ?").bind(id).first(); return e && e.address ? (e.city && !e.address.toLowerCase().includes(e.city.toLowerCase()) ? `${e.address}, ${e.city}` : e.address) : ""; }
  if (kind === "post") { const p = await env.DB.prepare("SELECT street, city, zip FROM posts WHERE id = ?").bind(id).first(); return p && p.street ? [p.street, p.city, p.zip].filter(Boolean).join(", ") : ""; }
  return "";
}

export async function onRequestPost({ request, env, waitUntil }) {
  const b = await request.json().catch(() => ({}));
  const r = await env.DB.prepare("SELECT * FROM removal_requests WHERE id = ?").bind(String(b.id || "")).first();
  if (!r) return err(404, "That request no longer exists.");
  if (r.status !== "open") return err(409, "That request was already handled.");
  const what = r.address || r.ref;
  if (b.action === "decline") {
    const reason = clean(b.reason, 400);
    await env.DB.prepare("UPDATE removal_requests SET status = 'declined', admin_note = ?, handled_at = datetime('now') WHERE id = ?").bind(reason, r.id).run();
    tell(env, waitUntil, r.email, "home_removal_declined", { listing: what, reason });
    return json({ ok: true });
  }
  if (b.action === "approve") {
    let target = clean(b.target, 100);
    if (!target && r.ref) { const t = await resolveRef(env, r.ref); if (t) target = `${t.kind}:${t.row.id}`; }
    let removed = "";
    if (target) {
      // keep where the home was, so the Grok intake (and anything else that adds events) can recognise it later: the request may only have named a listing, and the listing is about to be deleted
      if (!r.address) { const where = await addressOf(env, target); if (where) await env.DB.prepare("UPDATE removal_requests SET address = ? WHERE id = ?").bind(where, r.id).run(); }
      removed = await removeListing(env, target);
    }
    if (!removed && b.nothing !== true) return err(400, target ? "That listing wasn't found (it may already be gone). Tick \"nothing to remove\" to close the request." : "Pick the listing to remove, or tick \"nothing to remove\" to close the request.");
    await env.DB.prepare("UPDATE removal_requests SET status = 'done', target = ?, handled_at = datetime('now') WHERE id = ?").bind(removed ? target : "", r.id).run();
    tell(env, waitUntil, r.email, "home_removal_done", { listing: what });
    return json({ ok: true, removed });
  }
  return err(400, "Unknown action.");
}
