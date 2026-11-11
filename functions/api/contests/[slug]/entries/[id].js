// POST /api/contests/<slug>/entries/<id> { action: "approve" | "decline" | "flag" | "unflag" } — organizer reviews one entry.
import { json, err, clean } from "../../../../_lib/util.js";
import { sendTemplate } from "../../../../_lib/mailtpl.js";
import { getUser, sameOrigin } from "../../../../_lib/auth.js";
import { ownerOf, approveEntry } from "../../../../_lib/contests.js";
import { newPhotoToken, photoLink } from "../../../../_lib/entryphotos.js";
import { parseHome, homeKey, locate } from "../../../../_lib/homes.js";
import { normName, normText } from "../../../../_lib/fields.js";
import { fmtDate } from "../../../../../public/contestfmt.js";

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id = ?").bind(params.id, c.id).first();
  if (!row) return err(404, "That entry doesn't exist.");
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") {
    // Fix the name, description or address of a home the organizer added herself (a typo in a name, a wrong number). Name and description stay editable after
    // the winners are announced (a misspelled winner's name matters); the address is locked then, because it moves the pin.
    if (!row.photo_token) return err(400, "Only homes you added yourself can be edited here. A resident edits their own entry from the contest page.");
    const name = b.name === undefined ? row.title : normName(clean(b.name, 90));
    if (name.length < 2) return err(400, "Give the home a name of at least 2 letters.");
    const descr = b.desc === undefined ? row.descr : normText(clean(b.desc, 300));
    let sql = "UPDATE posts SET biz = ?, title = ?, descr = ?", args = [name, name, descr];
    if (b.address !== undefined && clean(b.address, 200) !== (row.address || "")) {
      if (c.announced) return err(409, "The address is locked once results are announced.");
      const h = parseHome(clean(b.address, 200), c.city);
      if (h.error) return err(400, h.error);
      const taken = (await env.DB.prepare("SELECT id, street, address FROM posts WHERE contest_id = ? AND status != 'declined' AND id != ?").bind(c.id, row.id).all()).results;
      if (taken.some((p) => homeKey(p.street || p.address) === homeKey(h.street))) return err(400, "Another home in this contest already has that address.");
      const r = await locate(h, c);
      if (r.reason) return err(400, r.reason);
      sql += ", street = ?, city = ?, zip = ?, address = ?, lat = ?, lng = ?";
      args.push(h.street, h.city, h.zip, `${h.street}, ${h.city}, CA${h.zip ? " " + h.zip : ""}`, r.pt[0], r.pt[1]);
    }
    await env.DB.prepare(sql + " WHERE id = ?").bind(...args, row.id).run();
    return json({ ok: true });
  }
  // Once winners are announced the results are frozen: no entry can be approved, restored, declined or flagged any more.
  if (c.announced) return err(409, "Results are locked.");
  const page = `https://socallights.app/c/${c.slug}`, tell = (id, vars) => { if (!row.contact_email) return; const job = sendTemplate(env, id, row.contact_email, vars).catch(() => {}); if (waitUntil) waitUntil(job); };
  const name = row.title || row.biz;
  if (b.action === "approve") {
    await approveEntry(env, row);
    tell("entry_approved", { name, contest: c.name, vote_start: fmtDate(c.vote_start), vote_end: fmtDate(c.vote_end), link: page });
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
  if (b.action === "newlink" || b.action === "unclaim") {
    // newlink: a new private link for a home the organizer added herself; the old link stops working at once (use it if a link was shared by mistake). The homeowner who already
    //   linked the home keeps it (their profile shows the current link).
    // unclaim: lets go of the homeowner who linked the home (a wrong person linked it): the home goes back to the organizer, with a new link.
    if (!row.photo_token || row.status !== "approved") return err(400, "Only homes you added yourself have a photo link.");
    const t = newPhotoToken();
    if (b.action === "unclaim") {
      if (!row.user_id) return err(400, "No homeowner has linked this home yet.");
      await env.DB.prepare("UPDATE posts SET user_id = '', contact_email = '', claimed_at = NULL, photo_token = ? WHERE id = ?").bind(t, row.id).run();
    } else await env.DB.prepare("UPDATE posts SET photo_token = ? WHERE id = ?").bind(t, row.id).run();
    return json({ ok: true, link: photoLink(new URL(request.url).origin, t) }, { headers: { "cache-control": "no-store" } });
  }
  return err(400, "Unknown action.");
}
