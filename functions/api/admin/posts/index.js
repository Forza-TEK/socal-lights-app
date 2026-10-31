// GET /api/admin/posts?status=pending|approved|declined
import { json, rowToPost } from "../../../_lib/util.js";
import { pairs } from "../../../_lib/addrkey.js";

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status") || "pending";
  if (!["pending", "approved", "declined"].includes(status)) return json([]);
  const { results } = await env.DB.prepare("SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 500").bind(status).all();
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
  return json(out);
}
