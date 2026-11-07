// POST /api/contest-pass/contact  { note?, site? } — a signed-in organizer asks about running more than 20 contests in a window. No checkout. Stores one lead (Admin > Contests > Contest passes) and
// emails the Admin. Three a day per account.
import { json, err, clean, newId } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { keyForUser } from "../../_lib/passkey.js";
import { orgLabel } from "../../_lib/passes.js";
import { tell } from "../../_lib/notify.js";

export async function onRequestPost({ request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in first.");
  const b = (await request.json().catch(() => null)) || {};
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_pass_leads WHERE user_id = ? AND created_at > datetime('now','-1 day')").bind(user.id).first();
  if (n.n >= 3) return err(429, "We already have your message. We will write to you soon.");
  const key = await keyForUser(env, user, b.site !== undefined && b.site !== null ? clean(b.site, 200) : null), note = clean(b.note, 500);
  await env.DB.prepare("INSERT INTO contest_pass_leads (id, user_id, email, org_key, note) VALUES (?,?,?,?,?)").bind(newId(), user.id, user.email, key, note).run();
  tell(env, waitUntil, env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", "contest_pass_contact", { email: user.email, org: orgLabel(key), note, link: "https://socallights.app/admin/" });
  return json({ ok: true });
}
