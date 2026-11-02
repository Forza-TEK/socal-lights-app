// POST /api/contests/<slug>/invite { emails } — organizer: email neighbors a link to enter or vote. Up to 50 addresses at a time.
import { json, err } from "../../../_lib/util.js";
import { sendTemplate } from "../../../_lib/mailtpl.js";
import { getUser, sameOrigin, okEmail } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.status !== "live" || c.announced) return err(400, "This contest isn't taking entries or votes right now.");
  const b = await request.json().catch(() => ({}));
  const list = [...new Set((Array.isArray(b.emails) ? b.emails : String(b.emails || "").split(/[\n,;\s]+/)).map((x) => String(x).trim()).filter(okEmail))].slice(0, 50);
  if (!list.length) return err(400, "Add at least one email address.");
  const note = String(b.note || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 300).trim();
  let sent = 0;
  for (const to of list) if (await sendTemplate(env, "contest_invite", to, { org: c.org, contest: c.name, city: c.city, note, link: `https://socallights.app/c/${c.slug}`, reply_to: c.contact_email })) sent++;
  return json({ ok: true, count: list.length, sent });
}
