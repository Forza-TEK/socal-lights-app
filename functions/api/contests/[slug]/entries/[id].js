// POST /api/contests/<slug>/entries/<id> { action: "approve" | "decline" | "flag" | "unflag" } — organizer reviews one entry.
import { json, err, clean } from "../../../../_lib/util.js";
import { getUser, sameOrigin, sendMail } from "../../../../_lib/auth.js";
import { ownerOf, approveEntry } from "../../../../_lib/contests.js";

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id = ?").bind(params.id, c.id).first();
  if (!row) return err(404, "That entry doesn't exist.");
  const b = await request.json().catch(() => ({}));
  const page = `https://socallights.app/c/${c.slug}`, tell = (subject, text) => { if (!row.contact_email) return; const job = sendMail(env, { to: row.contact_email, subject, text }).catch(() => {}); if (waitUntil) waitUntil(job); };
  const name = row.title || row.biz;
  if (b.action === "approve") {
    await approveEntry(env, row);
    tell(`Your entry is in: ${c.name}`, `${name} was approved and is now in ${c.name}, on the contest page and on the map. Voting runs ${c.vote_start} to ${c.vote_end}. Share the link so neighbors can vote: ${page}`);
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
    if (c.announced) return err(400, "The winners are announced and the results are locked.");
    await env.DB.prepare("UPDATE posts SET dq = ? WHERE id = ?").bind(b.action === "flag" ? 1 : 0, row.id).run();
    return json({ ok: true });
  }
  if (b.action === "decline") {
    const reason = clean(b.reason, 300), wasPending = row.status === "pending";
    // Pending photos are private and stay so the organizer can undo; photos of an approved entry are public, so they are removed
    if (!wasPending) await Promise.all(JSON.parse(row.photos || "[]").map((k) => env.PHOTOS.delete(k)));
    await env.DB.batch([env.DB.prepare(`UPDATE posts SET status='declined'${wasPending ? "" : ", photos='[]'"} WHERE id = ?`).bind(row.id), env.DB.prepare("DELETE FROM votes WHERE post_id = ?").bind(row.id)]);
    tell(`About your entry: ${c.name}`, `${c.org} couldn't include ${name} in ${c.name}.${reason ? ` Reason: ${reason}` : ""}\n\nYou can enter again with new photos or details while entries are open: ${page}/enter`);
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
