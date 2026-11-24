// POST /api/admin/transfer { kind: "event" | "home" | "installer", id, email } — Admin moves one listing to another person's account (F-10b).
// The person must already have an account (they sign in once with that email first); a suspended account is refused. Ownership is keyed on email text, so:
//   home      : posts.contact_email and posts.user_id become the new account (a contest entry is a post too).
//   event     : the submitted-event rows for it (event_submissions.contact_email) move to the new email; an event with no submission gets an approved "admin" claim for the new account.
//               Approved claims by other people are NOT removed (they may be co-owners): the answer says how many remain, and Admin > Event claims is where they are managed.
//   installer : installers.owner_email becomes the new account's email (exact match is how the profile dashboard and Sponsor checkout recognise the owner).
// The change is written to the Admin log here (action "transfer", with the old and new owner in the detail) because /api/admin/transfer is not a per-item path the middleware logs.
import { json, err, newId } from "../../_lib/util.js";
import { normEmail, okEmail, mailAddress } from "../../_lib/auth.js";
import { record } from "../../_lib/adminlog.js";

export async function onRequestPost({ request, env, data }) {
  const b = await request.json().catch(() => null);
  if (!b || !["event", "home", "installer"].includes(b.kind) || typeof b.id !== "string" || !b.id) return err(400, "Choose what to transfer.");
  if (!okEmail(b.email)) return err(400, "Enter the new owner's email address.");
  const to = normEmail(b.email);
  const user = await env.DB.prepare("SELECT id, email, status FROM users WHERE email = ?").bind(to).first();
  if (!user) return err(404, "There is no account with that email yet. Ask them to sign in once at socallights.app with it, then try again.");
  if (user.status === "suspended") return err(409, "That account is suspended.");
  const mailTo = await mailAddress(env, user.email);
  const admin = (data && data.admin && data.admin.email) || "admin";
  let label = "", from = "", note = "";

  if (b.kind === "home") {
    const p = await env.DB.prepare("SELECT id, title, biz, contact_email, user_id FROM posts WHERE id = ?").bind(b.id).first();
    if (!p) return err(404, "That home no longer exists.");
    label = p.title || p.biz || p.id; from = p.contact_email || "";
    await env.DB.prepare("UPDATE posts SET contact_email = ?, user_id = ? WHERE id = ?").bind(mailTo, user.id, p.id).run();
  } else if (b.kind === "installer") {
    const i = await env.DB.prepare("SELECT id, name, owner_email FROM installers WHERE id = ? OR slug = ?").bind(b.id, b.id).first();
    if (!i) return err(404, "That installer no longer exists.");
    label = i.name; from = i.owner_email || "";
    await env.DB.prepare("UPDATE installers SET owner_email = ? WHERE id = ?").bind(user.email, i.id).run();
  } else {
    const e = await env.DB.prepare("SELECT id, name FROM events WHERE id = ?").bind(b.id).first();
    if (!e) return err(404, "That event no longer exists.");
    label = e.name;
    const subs = (await env.DB.prepare("SELECT id, contact_email FROM event_submissions WHERE event_id = ?").bind(e.id).all()).results;
    from = [...new Set(subs.map((s) => s.contact_email).filter(Boolean))].join(", ");
    if (subs.length) await env.DB.prepare("UPDATE event_submissions SET contact_email = ? WHERE event_id = ?").bind(mailTo, e.id).run();
    else await env.DB.prepare("INSERT INTO event_claims (id, event_id, user_id, email, method, status, note, decided_at) VALUES (?,?,?,?, 'admin', 'approved', ?, datetime('now')) ON CONFLICT(event_id, user_id) DO UPDATE SET status = 'approved', method = 'admin', decided_at = datetime('now')").bind(newId(), e.id, user.id, user.email, "Transferred by " + admin).run();
    const others = (await env.DB.prepare("SELECT COUNT(*) AS n FROM event_claims WHERE event_id = ? AND status = 'approved' AND user_id != ?").bind(e.id, user.id).first()).n;
    if (others) note = `${others} other approved claim${others === 1 ? "" : "s"} on this event still ${others === 1 ? "has" : "have"} access (Admin > Event claims).`;
  }
  await record(env, { admin, area: b.kind === "home" ? "posts" : b.kind === "installer" ? "installers" : "events", action: "transfer", id: b.id, label, detail: `owner: ${from || "(none)"} -> ${mailTo}` });
  return json({ ok: true, to: mailTo, note });
}
