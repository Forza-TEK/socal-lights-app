// POST /api/installers/<slug>/claim — a signed-in person says they run this company.
// An email at the company's website domain claims it straight away (the same rule as contests); anything else asks the site owner.
import { json, err } from "../../../_lib/util.js";
import { sendTemplate } from "../../../_lib/mailtpl.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { trustOf } from "../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const user = await getUser(request, env);
  if (!user) return err(401, "Please sign in first.");
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ? AND status = 'active'").bind(params.slug).first();
  if (!inst) return err(404, "That installer isn't listed.");
  if (inst.owner_email && inst.owner_email === user.email) return json({ ok: true, claimed: true });
  if (inst.owner_email) return err(409, "This profile already has an owner. Email info@socallights.app if that isn't right.");
  if (trustOf(user.email, inst.web) === "match") {
    await env.DB.prepare("UPDATE installers SET owner_email = ? WHERE id = ?").bind(user.email, inst.id).run();
    return json({ ok: true, claimed: true });
  }
  await sendTemplate(env, "installer_claim", env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", { email: user.email, installer: inst.name, web: inst.web || "no website on file" }).catch(() => {});
  return json({ ok: true, claimed: false, message: "Thanks. Because your email isn't at the company's website, a person will check and confirm by email." });
}
