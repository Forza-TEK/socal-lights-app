// POST /api/contests/<slug>/invite { emails } — organizer: email neighbors a link to enter or vote. Up to 10 addresses at a time, 30 a day per contest, 100 a day per account.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin, okEmail, sendMail } from "../../../_lib/auth.js";
import { reserveSends, cleanNote } from "../../../_lib/sendlimit.js";
import { ownerOf } from "../../../_lib/contests.js";
import { sendNow } from "../../../_lib/mailbatch.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.status !== "live" || c.announced) return err(400, "This contest isn't taking entries or votes right now.");
  const b = await request.json().catch(() => ({}));
  const list = [...new Set((Array.isArray(b.emails) ? b.emails : String(b.emails || "").split(/[\n,;\s]+/)).map((x) => String(x).trim()).filter(okEmail))];
  if (!list.length) return err(400, "Add at least one email address.");
  const note = cleanNote(b.note);
  const over = await reserveSends(env, user, c.id, "invite", list.length);
  if (over) return err(429, over);
  const vars = { contest: c.name, org: c.org, city: c.city, link: `https://socallights.app/c/${c.slug}`, note, contact: c.contact_email || "" };
  // One Resend batch call for the whole list (at most 10 addresses), not one call per address
  const sent = (await sendNow(env, list.map((to) => ({ id: "contest_invite", to, vars })), "contest_invite")).filter(Boolean).length;
  return json({ ok: true, count: list.length, sent });
}
