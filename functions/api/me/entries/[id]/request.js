// POST /api/me/entries/<post id>/request { kind: "remove" | "restore" } — a signed-in entrant of a contest asks Admin to take their entry off the public page after voting closed
// ("remove"), or to put an entry they withdrew back ("restore"). Uses the removal queue in Admin (a restore request's note starts with "[restore]"). One open request per entry.
import { json, err, newId } from "../../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../../_lib/auth.js";
import { sendTemplate } from "../../../../_lib/mailtpl.js";

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const user = await getUser(request, env); if (!user) return err(401, "Please sign in first.");
  const b = await request.json().catch(() => ({})), kind = b.kind === "restore" ? "restore" : "remove";
  const p = await env.DB.prepare("SELECT p.id,p.title,p.biz,p.address,p.status,c.name AS contest, c.announced, p.review_note, p.photo_token FROM posts p JOIN contests c ON c.id = p.contest_id WHERE p.id = ? AND p.user_id = ?").bind(params.id, user.id).first();
  if (!p) return err(404, "That entry isn't on your account.");
  if (kind === "restore" ? p.status !== "declined" : p.status !== "approved") return err(409, kind === "restore" ? "This entry is still in the contest." : "This entry is not in the contest.");
  if (kind === "restore" && p.review_note !== "withdrawn") return err(409, "The organizer took this entry out of the contest, so it can only be changed by them.");
  if (kind === "restore" && !p.photo_token) return err(409, "A withdrawn entry loses its photos. Please enter your home again from the contest page.");
  if (kind === "restore" && p.announced) return err(409, "The winners have been announced, so this entry can't be put back.");
  const open = await env.DB.prepare("SELECT id FROM removal_requests WHERE ref = ? AND status = 'open'").bind("h-" + p.id).first();
  if (open) return err(409, "A request for this home is already waiting for us.");
  const note = (kind === "restore" ? "[restore] Please put this entry back in " : "Please take this entry out of ") + p.contest;
  await env.DB.prepare("INSERT INTO removal_requests (id, ref, address, email, note) VALUES (?,?,?,?,?)").bind(newId(), "h-" + p.id, p.address || "", user.email, note).run();
  const job = sendTemplate(env, "home_removal_admin", env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", { listing: "h-" + p.id, address: p.address || p.title || p.biz, email: user.email, note, link: "https://socallights.app/admin/" }).catch(() => {});
  if (waitUntil) waitUntil(job); else await job;
  return json({ ok: true, kind });
}
