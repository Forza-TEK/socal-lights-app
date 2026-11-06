// GET /api/admin/posts?status=pending|approved|declined
import { json, rowToPost } from "../../../_lib/util.js";
import { pairs } from "../../../_lib/addrkey.js";

export async function onRequestGet({ request, env }) {
  const qs = new URL(request.url).searchParams, status = qs.get("status") || "pending";
  // One record by id, whatever its status (used when a profile links to a house)
  if (qs.get("id")) {
    const r = await env.DB.prepare("SELECT p.*, i.slug AS inst_slug, i.name AS inst_name FROM posts p LEFT JOIN installers i ON i.id = p.installer_id WHERE p.id = ?").bind(qs.get("id")).first();
    return json(r ? [rowToPost(r, true)] : []);
  }
  if (!["pending", "approved", "declined"].includes(status)) return json([]);
  const { results } = await env.DB.prepare("SELECT p.*, i.slug AS inst_slug, i.name AS inst_name FROM posts p LEFT JOIN installers i ON i.id = p.installer_id WHERE p.status = ? AND p.contest_id IS NULL ORDER BY p.created_at DESC LIMIT 500").bind(status).all();
  const out = results.map((r) => rowToPost(r, true));
  // For houses waiting for review: which sweep records would this replace (same address), and which are close (same street, other number)?
  if (status === "pending" && out.length) {
    try {
      const events = (await env.DB.prepare("SELECT id, name, city, address FROM events WHERE address != ''").all()).results;
      const posts = results.filter((r) => !r.contest_id).map((r) => ({ id: r.id, street: r.street, address: r.address, city: r.city, zip: r.zip }));
      const { exact, near } = pairs(posts, events), by = new Map(out.map((p) => [p.id, p]));
      for (const x of exact) (by.get(x.post.id).replaces ||= []).push({ id: x.event.id, name: x.event.name, address: x.event.address });
      for (const x of near) (by.get(x.post.id).nearby ||= []).push({ id: x.event.id, name: x.event.name, address: x.event.address });
    } catch {}
  }
  // A display that says it is the owner's home for an automatic listing ("Is this your home?" on the map), whatever its status.
  // `matched` = the addresses agree, so the automatic listing is replaced (or will be, once the display is approved).
  if (out.length) {
    try {
      const withClaim = results.filter((r) => r.claim_event_id);
      if (withClaim.length) {
        const ids = [...new Set(withClaim.map((r) => r.claim_event_id))], evs = (await env.DB.prepare(`SELECT id, name, city, address FROM events WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all()).results, by = new Map(out.map((p) => [p.id, p]));
        for (const r of withClaim) {
          const e = evs.find((x) => x.id === r.claim_event_id), p = by.get(r.id); if (!e || !p) continue;
          const matched = pairs([{ id: r.id, street: r.street, address: r.address, city: r.city, zip: r.zip }], [e]).exact.length > 0;
          p.claimed = { id: e.id, name: e.name, address: e.address, matched };
        }
      }
    } catch {}
  }
  if (status === "approved" && out.length) {
    try {
      const chosen = (await env.DB.prepare("SELECT id, city, address FROM events WHERE keep_listed = 2 AND address != ''").all()).results;
      if (chosen.length) { const ids = new Set(pairs(results.filter((r) => !r.contest_id), chosen).exact.map((x) => x.post.id)); for (const p of out) if (ids.has(p.id)) p.hiddenBySweep = true; }
    } catch {}
  }
  return json(out);
}
