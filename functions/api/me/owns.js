// GET /api/me/owns?ref=h:<post id> | e:<event id> — does the signed-in person own this home or event, and what is its state? Used by /ownerbar.js on the public pages
// (which are cached for everyone, so they can't know who is looking). Answers only about the caller's own records; never cached.
import { json } from "../../_lib/util.js";
import { getUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const NO = { headers: { "cache-control": "no-store" } };
  const ref = String(new URL(request.url).searchParams.get("ref") || ""), [kind, ...r] = ref.split(":"), id = r.join(":");
  const user = await getUser(request, env);
  if (!user || !/^[A-Za-z0-9_-]{1,60}$/.test(id)) return json({ owned: false }, NO);
  const email = String(user.email || "").toLowerCase();
  if (kind === "h") {
    const p = await env.DB.prepare("SELECT status, title, contest_id FROM posts WHERE id = ? AND (user_id = ? OR (COALESCE(user_id,'') = '' AND lower(contact_email) = ?))").bind(id, user.id, email).first();
    return json(p ? { owned: true, kind: "home", status: p.status, contest: !!p.contest_id } : { owned: false }, NO);
  }
  if (kind === "e") {
    const s = await env.DB.prepare("SELECT status FROM event_submissions WHERE event_id = ? AND lower(contact_email) = ? LIMIT 1").bind(id, email).first();
    return json(s ? { owned: true, kind: "event", status: s.status } : { owned: false }, NO);
  }
  return json({ owned: false }, NO);
}
