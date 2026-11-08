// /api/contests/<slug>/sponsors — the organizer (or a co-organizer) records sponsors. The site is NOT a party to sponsor money: the organizer collects it (rules: functions/_lib/sponsors.js).
//   GET    ?list=1            the organizer's records, with contact details (never the receipt key). Staff only.
//   GET    ?id=<id>           a sponsor's logo. Public only for a sponsor that is shown on the contest page; staff can always see it.
//   GET    ?id=<id>&receipt=1 the PRIVATE receipt or paid invoice. Organizer or co-organizer only: signed out 404, another signed-in account 403. Never cached. Admin uses /api/admin/sponsors.
//   POST   multipart (id? to update; name, contact_name, tier, url, phone, email, amount, basis paid|in_kind, collected, paid_date, paid_method, in_kind_note, show, permission, logo?, receipt?, remove_receipt?)
//   DELETE ?id=               removes the record, its logo and its receipt.
import { json, err, newId } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf, getContest, isStaff } from "../../../_lib/contests.js";
import { teamChanged } from "../../../_lib/changes.js";
import { r2Delete } from "../../../_lib/dbchunk.js";
import { MAX_SPONSORS, LOGO_MAX, RECEIPT_MAX, sniffImage, sniffReceipt, readSponsorForm, staffView, isPublic, plainText } from "../../../_lib/sponsors.js";
import { tell } from "../../../_lib/notify.js";

export async function onRequestGet({ params, request, env }) {
  const u = new URL(request.url), id = u.searchParams.get("id") || "", c = await getContest(env, params.slug);
  const user = await getUser(request, env);
  if (u.searchParams.get("list") === "1") {
    if (!user) return err(401, "Please sign in first.");
    if (!c || !(await isStaff(env, c, user))) return err(404, "That contest isn't yours or doesn't exist.");
    const rows = (await env.DB.prepare("SELECT * FROM contest_sponsors WHERE contest_id = ? ORDER BY created_at").bind(c.id).all()).results;
    return json({ sponsors: rows.map(staffView) }, { headers: { "cache-control": "no-store" } });
  }
  const row = c && id && (await env.DB.prepare("SELECT * FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(id, c.id).first());
  if (!row) return new Response("Not found", { status: 404 });
  const staff = !!user && (await isStaff(env, c, user));
  if (u.searchParams.get("receipt") === "1") {
    // Receipts are private: nothing public, no listing. 404 for a visitor who is not signed in, 403 for a signed-in account that is not on the contest team.
    if (!user) return new Response("Not found", { status: 404 });
    if (!staff) return new Response("Not allowed", { status: 403, headers: { "cache-control": "no-store" } });
    const obj = row.receipt && (await env.PHOTOS.get(row.receipt));
    if (!obj) return new Response("Not found", { status: 404 });
    const h = new Headers(); obj.writeHttpMetadata(h);
    h.set("cache-control", "private, no-store"); h.set("x-content-type-options", "nosniff"); h.set("content-disposition", `inline; filename="receipt.${row.receipt.split(".").pop()}"`);
    return new Response(obj.body, { headers: h });
  }
  if (!row.logo || !(isPublic(row) || staff) || (c.status !== "live" && !staff)) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(row.logo);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers(); obj.writeHttpMetadata(h); h.set("cache-control", isPublic(row) ? "public, max-age=3600" : "private, no-store");
  return new Response(obj.body, { headers: h });
}

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const form = await request.formData().catch(() => null);
  if (!form) return err(400, "The form couldn't be read.");
  const rid = String(form.get("id") || ""), old = rid ? await env.DB.prepare("SELECT * FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(rid, c.id).first() : null;
  if (rid && !old) return err(404, "That sponsor no longer exists.");
  // Review actions on a sponsor (a submission from the invite link, or a record of your own): approve for the contest page, or decline with an optional short note.
  const act = String(form.get("act") || "");
  if (act === "approve" || act === "decline") {
    if (!old) return err(404, "That sponsor no longer exists.");
    if (act === "approve") {
      if (!(old.basis === "paid" || (old.basis === "in_kind" && old.in_kind_note))) return err(400, "Mark the payment as received (or donated in kind) before you approve this sponsor for the contest page.");
      if (!old.permission) return err(400, "Tick that you have the sponsor's permission to list their name and logo first.");
      await env.DB.prepare("UPDATE contest_sponsors SET status = 'approved', show_public = 1, decline_note = '', updated_at = datetime('now') WHERE id = ?").bind(old.id).run();
    } else {
      const note = plainText(form.get("note"), 200);
      await env.DB.prepare("UPDATE contest_sponsors SET status = 'declined', show_public = 0, decline_note = ?, updated_at = datetime('now') WHERE id = ?").bind(note, old.id).run();
      tell(env, waitUntil, old.email, "sponsor_declined", { contest: c.name, organizer: c.org, company: old.name, note });
    }
    await teamChanged(env, c, user, [{ label: "Sponsors", old: old.name, new: act === "approve" ? "Approved for the contest page" : "Declined" }], waitUntil);
    return json({ ok: true, id: old.id, sponsor: staffView(await env.DB.prepare("SELECT * FROM contest_sponsors WHERE id = ?").bind(old.id).first()) });
  }
  const { v, error } = readSponsorForm(form);
  if (error) return err(400, error);
  if (!old) { const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_sponsors WHERE contest_id = ?").bind(c.id).first(); if (n >= MAX_SPONSORS) return err(400, "That's the most sponsors a contest can show."); }
  const id = old ? old.id : newId();
  let logo = old ? old.logo : "", receipt = old ? old.receipt : "", receiptName = old ? old.receipt_name : "";
  const lf = form.get("logo"), rf = form.get("receipt"), drop = [];
  // Check every file first so a refused upload leaves nothing half-saved
  let lt = null, lbuf = null, rt = null, rbuf = null;
  if (lf && typeof lf === "object" && lf.size) {
    if (lf.size > LOGO_MAX) return err(400, "That logo is too large. Use an image under 600 KB.");
    lbuf = await lf.arrayBuffer(); lt = sniffImage(lbuf); if (!lt) return err(400, "Logos must be a JPG, PNG or WebP image.");
  }
  if (rf && typeof rf === "object" && rf.size) {
    if (rf.size > RECEIPT_MAX) return err(400, "That receipt is too large. Use a PDF, JPG or PNG under 5 MB.");
    rbuf = await rf.arrayBuffer(); rt = sniffReceipt(rbuf); if (!rt) return err(400, "A receipt must be a PDF, JPG or PNG file.");
  }
  if (lt) { if (logo) drop.push(logo); logo = `sponsor/${c.id}/${id}.${lt.ext}`; await env.PHOTOS.put(logo, lbuf, { httpMetadata: { contentType: lt.type } }); }
  if (rt) { if (receipt) drop.push(receipt); receipt = `sponsor-receipt/${c.id}/${id}.${rt.ext}`; receiptName = String(rf.name || "").replace(/[^\w.\- ]/g, "").slice(0, 80); await env.PHOTOS.put(receipt, rbuf, { httpMetadata: { contentType: rt.type, contentDisposition: "attachment" } }); }
  else if (old && old.receipt && form.get("remove_receipt") === "1") { drop.push(old.receipt); receipt = ""; receiptName = ""; }
  const keep = new Set([logo, receipt]), gone = drop.filter((k) => k && !keep.has(k));
  if (old) {
    await env.DB.prepare("UPDATE contest_sponsors SET name=?, contact_name=?, tier=?, url=?, phone=?, email=?, amount_cents=?, basis=?, paid_date=?, paid_method=?, in_kind_note=?, show_public=?, permission=?, logo=?, receipt=?, receipt_name=?, updated_at=datetime('now') WHERE id=? AND contest_id=?")
      .bind(v.name, v.contact_name, v.tier, v.url, v.phone, v.email, v.amount_cents, v.basis, v.paid_date, v.paid_method, v.in_kind_note, v.show_public, v.permission, logo, receipt, receiptName, id, c.id).run();
  } else {
    await env.DB.prepare("INSERT INTO contest_sponsors (id, contest_id, name, contact_name, tier, url, phone, email, amount_cents, basis, paid_date, paid_method, in_kind_note, show_public, permission, logo, receipt, receipt_name, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))")
      .bind(id, c.id, v.name, v.contact_name, v.tier, v.url, v.phone, v.email, v.amount_cents, v.basis, v.paid_date, v.paid_method, v.in_kind_note, v.show_public, v.permission, logo, receipt, receiptName).run();
  }
  if (old && old.status === "submitted" && v.show_public && v.basis) await env.DB.prepare("UPDATE contest_sponsors SET status = 'approved' WHERE id = ?").bind(id).run(); // choosing to show a submission you confirmed is approving it
  if (gone.length) await r2Delete(env, gone, "sponsor files");
  // The change log names the sponsor and what happened, never the contact details or the amount.
  await teamChanged(env, c, user, [{ label: "Sponsors", old: old ? old.name : "", new: old ? `Updated ${v.name}` : `Added ${v.name} (${v.tier})` }], waitUntil);
  const row = await env.DB.prepare("SELECT * FROM contest_sponsors WHERE id = ?").bind(id).first();
  return json({ ok: true, id, sponsor: staffView(row) });
}

export async function onRequestDelete({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const id = new URL(request.url).searchParams.get("id") || "";
  const row = await env.DB.prepare("SELECT logo, receipt, name FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(id, c.id).first();
  if (row) await r2Delete(env, [row.logo, row.receipt], "sponsor files");
  await env.DB.prepare("DELETE FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(id, c.id).run();
  if (row) await teamChanged(env, c, user, [{ label: "Sponsors", old: row.name, new: "Removed" }], waitUntil);
  return json({ ok: true });
}
