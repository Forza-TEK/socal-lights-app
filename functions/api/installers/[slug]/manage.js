// GET /api/installers/<slug>/manage — the owner's dashboard data: details, homes that name them (to confirm or remove), page views, quote requests.
// POST { action: "edit" | "confirm" | "remove" } — edit details (web, phone, area, blurb), confirm a homeowner's claim, or take it off.
import { json, err, clean, webUrl } from "../../../_lib/util.js";
import { sendTemplate } from "../../../_lib/mailtpl.js";
import { selectIn } from "../../../_lib/dbchunk.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { phoneField, line, normText } from "../../../_lib/fields.js";
import { INSTALLER_PLANS, ptToday } from "../../../_lib/featured.js";
import { renewalFor, renewingPlan, cancelRenewal, consentText, CONSENT_VERSION, usd } from "../../../_lib/renewal.js";
import { stripeCall, checkoutLimit } from "../../../_lib/stripe.js";

async function owner(request, env, slug) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ?").bind(slug).first();
  if (!inst || inst.owner_email !== user.email) return { res: err(404, "That profile isn't yours.") };
  return { inst };
}
export async function onRequestGet({ params, request, env }) {
  const { inst, res } = await owner(request, env, params.slug);
  if (res) return res;
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
  const [claims, homes, views, leads, shared] = await Promise.all([
    q("SELECT id, title, biz, city FROM posts WHERE installer_id = ? AND status = 'approved' AND installer_confirmed = 0 AND poster_type != 'installer' ORDER BY created_at DESC LIMIT 100", inst.id),
    q("SELECT COUNT(*) AS n FROM posts WHERE installer_id = ? AND status = 'approved'", inst.id),
    q("SELECT day, n FROM installer_hits WHERE installer_id = ? ORDER BY day DESC LIMIT 30", inst.id),
    q("SELECT name, email, phone, note, created_at FROM installer_leads WHERE installer_id = ? ORDER BY created_at DESC LIMIT 100", inst.id),
    q("SELECT id, title, biz, city, status, poster_type, descr, where_txt, season, lights_on, visit, parking, accessible, radio, web, phone, service_area FROM posts WHERE installer_id = ? AND status IN ('approved','paused') AND (installer_confirmed = 1 OR poster_type = 'installer') ORDER BY created_at DESC LIMIT 100", inst.id),
  ]);
  const today = ptToday(), banner = (inst.banner_until && inst.banner_until >= today) || (inst.top_until && inst.top_until >= today) ? await env.DB.prepare("SELECT COALESCE(SUM(imp),0) AS imp, COALESCE(SUM(click),0) AS click, COALESCE(SUM(call),0) AS call, COALESCE(SUM(lst_imp),0) AS lst_imp, COALESCE(SUM(lst_click + lst_call),0) AS lst_taps FROM banner_stats WHERE installer_id = ? AND day >= date('now','-29 days')").bind(inst.id).first().catch(() => null) : null;
  const ids = shared.map((h) => h.id);
  const ch = (await selectIn(env, "SELECT post_id, by_name, by_role, field, old, new, at FROM listing_changes WHERE post_id IN ({IN}) ORDER BY at DESC, rowid DESC LIMIT 300", ids)).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 300); // 100 homes can be shared: more than D1's 100 bound parameters with the id list alone, so read in slices
  for (const h of shared) h.changes = ch.filter((c) => c.post_id === h.id).slice(0, 8);
  const rn = await renewalFor(env, inst.id).catch(() => null), run = renewingPlan(inst, ptToday()), rp = INSTALLER_PLANS[(rn && rn.plan) || (run && run.plan) || "banner"];
  const renewal = { on: !!(rn && rn.enabled === 1 && rn.status === "active"), status: rn ? rn.status : "off", plan: rp.label, price: usd(rp.cents), next_charge_date: rn && rn.enabled === 1 && rn.status === "active" ? rn.next_charge_date : "", last_error: rn && rn.status === "lapsed" ? rn.last_error : "", canTurnOn: !!run, consent: consentText(rp.cents) };
  return json({ renewal, installer: { slug: inst.slug, name: inst.name, web: inst.web, phone: inst.phone, area: inst.area, blurb: inst.blurb, hasLogo: !!inst.logo }, claims, shared, homes: homes[0].n, views: views.reverse(), viewsTotal: views.reduce((s, v) => s + v.n, 0), leads, banner: banner ? { until: inst.banner_until, top: !!(inst.top_until && inst.top_until >= today), ...banner } : null, placement: { banner_until: inst.banner_until >= today ? inst.banner_until : "", top_until: inst.top_until >= today ? inst.top_until : "" } }, { headers: { "cache-control": "no-store" } });
}
export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { inst, res } = await owner(request, env, params.slug);
  if (res) return res;
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") {
    const webRaw = clean(b.web, 200), web = webRaw ? webUrl(webRaw) : "";
    if (webRaw && !web) return err(400, "That website address doesn't look right.");
    const ph = phoneField(b.phone); if (ph.error) return err(400, ph.error);
    await env.DB.prepare("UPDATE installers SET web=?, phone=?, area=?, blurb=? WHERE id=?").bind(web || "", ph.value, line(b.area, 240), normText(clean(b.blurb, 600)), inst.id).run();
    return json({ ok: true });
  }
  if (b.action === "renewal_off") { const rn = await renewalFor(env, inst.id); const was = await cancelRenewal(env, rn, "dashboard"); return json({ ok: true, was_on: was }); }
  if (b.action === "renewal_on") {
    // Turning automatic renewal on from the dashboard: the box must be ticked (it is unticked by default), then a small Stripe setup page saves the card. Nothing is charged.
    if (b.consent !== true) return err(400, "Tick the box to agree to automatic renewal first.");
    if (/SoCalLightsApp/.test(request.headers.get("user-agent") || "")) return err(403, "Not available in the app.");
    if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
    const run = renewingPlan(inst, ptToday());
    if (!run) return err(400, "There is no running placement to renew. Buy a placement first, and tick the renewal box there.");
    const limited = await checkoutLimit(env, inst.id); if (limited) return err(429, limited);
    const user = await getUser(request, env), origin = new URL(request.url).origin, back = `${origin}/installer/${encodeURIComponent(inst.slug)}/manage`;
    const f = new URLSearchParams({ mode: "setup", "payment_method_types[0]": "card", "metadata[purpose]": "renewal", "metadata[event_id]": inst.id, "metadata[plan]": run.plan, "metadata[user_id]": user.id, "metadata[consent]": CONSENT_VERSION, success_url: back + "?renewal=on", cancel_url: back + "?renewal=cancelled" });
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "")) f.set("customer_email", user.email);
    const r = await stripeCall(env, "POST", "/v1/checkout/sessions", f);
    if (!r.ok || !r.data.url) return err(502, "The page to save your card couldn't be opened. Please try again in a moment.");
    return json({ url: r.data.url });
  }
  if (b.action === "confirm" || b.action === "remove") {
    const post = await env.DB.prepare("SELECT id, title, contact_email FROM posts WHERE id = ? AND installer_id = ?").bind(String(b.post || ""), inst.id).first();
    if (!post) return err(404, "That home doesn't name your company.");
    if (b.action === "confirm") await env.DB.prepare("UPDATE posts SET installer_confirmed = 1, installer_token = '' WHERE id = ?").bind(post.id).run();
    else await env.DB.prepare("UPDATE posts SET installer_id = NULL, installer_confirmed = 0, installer_token = '' WHERE id = ?").bind(post.id).run();
    if (post.contact_email) await sendTemplate(env, b.action === "confirm" ? "installer_confirmed" : "installer_removed", post.contact_email, { installer: inst.name, title: post.title }).catch(() => {});
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
