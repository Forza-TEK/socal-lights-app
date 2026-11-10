// POST /api/contests/<slug>/entries/<id> { action: "approve" | "decline" | "flag" | "unflag" } — organizer reviews one entry.
import { json, err, clean } from "../../../../_lib/util.js";
import { sendTemplate } from "../../../../_lib/mailtpl.js";
import { getUser, sameOrigin } from "../../../../_lib/auth.js";
import { ownerOf, approveEntry } from "../../../../_lib/contests.js";
import { newPhotoToken, photoLink } from "../../../../_lib/entryphotos.js";

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id = ?").bind(params.id, c.id).first();
  if (!row) return err(404, "That entry doesn't exist.");
  const b = await request.json().catch(() => ({}));
  // Once winners are announced the results are frozen: no entry can be approved, restored, declined or flagged any more.
  if (c.announced) return err(409, "Results are locked.");
  const page = `https://socallights.app/c/${c.slug}`, tell = (id, vars) => { if (!row.contact_email) return; const job = sendTemplate(env, id, row.contact_email, vars).catch(() => {}); if (waitUntil) waitUntil(job); };
  const name = row.title || row.biz;
  if (b.action === "approve") {
    await approveEntry(env, row);
    tell("entry_approved", { name, contest: c.name, vote_start: c.vote_start, vote_end: c.vote_end, link: page });
    return json({ ok: true });
  }
  if (b.action === "restore") {
    // Only an entry that was declined before approval can come back: its photos are still held privately
    if (row.status !== "declined" || !JSON.parse(row.photos || "[]").length) return err(400, "That entry can't be restored. Ask the entrant to enter again.");
    await env.DB.prepare("UPDATE posts SET status='pending' WHERE id = ?").bind(row.id).run();
    return json({ ok: true });
  }
  if (b.action === "flag" || b.action === "unflag") {
    // Disqualification is held until voting closes: the home stays on the ballot but can't win once winners are announced.
    await env.DB.prepare("UPDATE posts SET dq = ? WHERE id = ?").bind(b.action === "flag" ? 1 : 0, row.id).run();
    return json({ ok: true });
  }
  if (b.action === "decline") {
    const reason = clean(b.reason, 300), wasPending = row.status === "pending";
    // Pending photos are private and stay so the organizer can undo; photos of an approved entry are public, so they are removed
    if (!wasPending) await Promise.all(JSON.parse(row.photos || "[]").map((k) => env.PHOTOS.delete(k)));
    await env.DB.batch([env.DB.prepare(`UPDATE posts SET status='declined'${wasPending ? "" : ", photos='[]'"} WHERE id = ?`).bind(row.id), env.DB.prepare("DELETE FROM votes WHERE post_id = ?").bind(row.id)]);
    tell("entry_declined", { name, contest: c.name, org: c.org, reason, link: `${page}/enter` });
    return json({ ok: true });
  }
  if (b.action === "newlink") {
    // A new private photo link for a home the organizer added herself; the old link stops working at once (use it if a link was shared by mistake)
    if (row.user_id !== "" || row.status !== "approved") return err(400, "Only homes you added yourself have a photo link.");
    const t = newPhotoToken();
    await env.DB.prepare("UPDATE posts SET photo_token = ? WHERE id = ?").bind(t, row.id).run();
    return json({ ok: true, link: photoLink(new URL(request.url).origin, t) }, { headers: { "cache-control": "no-store" } });
  }
  return err(400, "Unknown action.");
}
