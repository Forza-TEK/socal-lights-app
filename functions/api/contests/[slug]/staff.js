// GET/POST/DELETE /api/contests/<slug>/staff — the creator invites co-organizers by email. They sign in with that email and get the same dashboard.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin, normEmail, okEmail, sendMail } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";
import { teamChanged } from "../../../_lib/changes.js";

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const { results } = await env.DB.prepare("SELECT email, added_at FROM contest_staff WHERE contest_id = ? ORDER BY added_at").bind(c.id).all();
  return json({ staff: results, owner: c.contact_email }, { headers: { "cache-control": "no-store" } });
}
export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser, true);
  if (res) return res;
  const b = await request.json().catch(() => ({}));
  if (!okEmail(b.email)) return err(400, "Enter a valid email address.");
  const email = normEmail(b.email);
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_staff WHERE contest_id = ?").bind(c.id).first();
  if (n >= 8) return err(400, "That's the most co-organizers a contest can have.");
  await env.DB.prepare("INSERT OR IGNORE INTO contest_staff (contest_id, email) VALUES (?, ?)").bind(c.id, email).run();
  await sendMail(env, { to: String(b.email).trim(), subject: `You can help run ${c.name}`, text: `${c.org} added you as a co-organizer of ${c.name}. Sign in with this email address to approve entries and manage the contest: https://socallights.app/c/${c.slug}/manage` });
  await teamChanged(env, c, user, [{ label: "Co-organizers", old: "", new: `Added ${email}` }], waitUntil);
  return json({ ok: true });
}
export async function onRequestDelete({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser, true);
  if (res) return res;
  const email = normEmail(new URL(request.url).searchParams.get("email") || "");
  await env.DB.prepare("DELETE FROM contest_staff WHERE contest_id = ? AND email = ?").bind(c.id, email).run();
  await teamChanged(env, c, user, [{ label: "Co-organizers", old: email, new: "Removed" }], waitUntil);
  return json({ ok: true });
}
