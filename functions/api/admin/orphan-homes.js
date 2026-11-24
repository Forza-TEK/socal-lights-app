// Homes with no owner account (audit F-12). Admin only (Cloudflare Access, the /api/admin middleware).
//   GET  /api/admin/orphan-homes          -> { homes: [{ id, title, city, status, contact_email, contest, organizer_added, account }] }
//        account is "yes" (an account exists for the home's own contact email: one click links it), "no" (nobody has signed in with that email yet), or "none" (the home has no email).
//   POST /api/admin/orphan-homes { id }   -> links the home to the account whose email is the home's own contact email. It is the ownership transfer (transfer.js), called with that email, so the
//        same checks and the same Admin-log line apply. For a home linked to a DIFFERENT account use "Transfer to another account" on the home itself (POST /api/admin/transfer).
//
// How a home gets no owner (every path in the code):
//   1. Organizer-added contest homes (POST /api/contests/<slug>/entries, user_id = ''): by design, the homeowner claims it with the link in the photo mail (api/home-photos/<token>).
//   2. An organizer releasing an entry (api/contests/<slug>/entries/<id>) or the owner deleting their account (_lib/account.js keeps contest entries with user_id = '').
//   3. Homes posted before sign-in was required (a showcase post without an account), still in the database.
//   A normal new home (POST /api/submit) always carries the signed-in account's id, so no new orphan comes from there.
import { json, err } from "../../_lib/util.js";
import { normEmail } from "../../_lib/auth.js";
import { onRequestPost as transfer } from "./transfer.js";

const ORPHAN = "(p.user_id IS NULL OR p.user_id = '')";

export async function listOrphans(env) {
  const rows = (await env.DB.prepare(`SELECT p.id, p.title, p.biz, p.city, p.status, p.contact_email, p.contest_id, p.added_by, p.created_at FROM posts p WHERE ${ORPHAN} AND p.status != 'declined' ORDER BY p.created_at DESC LIMIT 300`).all()).results;
  const out = [];
  for (const r of rows) {
    const email = normEmail(r.contact_email || "");
    const u = email ? await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first() : null;
    out.push({ id: r.id, title: r.title || r.biz || r.id, city: r.city, status: r.status, contact_email: r.contact_email || "", contest: !!r.contest_id, organizer_added: !!r.added_by, account: !email ? "none" : u ? "yes" : "no", created_at: r.created_at });
  }
  return out;
}

export async function onRequestGet({ env }) {
  return json({ homes: await listOrphans(env) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const b = await request.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !b.id) return err(400, "Choose a home.");
  const p = await env.DB.prepare("SELECT id, contact_email, user_id FROM posts WHERE id = ?").bind(b.id).first();
  if (!p) return err(404, "That home no longer exists.");
  if (p.user_id) return err(409, "That home already has an owner account. Use Transfer to another account to move it.");
  if (!p.contact_email) return err(409, "This home has no contact email, so there is no account to match. Use Transfer to another account and type the owner's email.");
  const req = new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "home", id: p.id, email: p.contact_email }) });
  return transfer({ ...context, request: req });
}
