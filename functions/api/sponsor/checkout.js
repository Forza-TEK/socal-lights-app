// POST /api/sponsor/checkout  { installer: <profile slug>, plan: "banner" | "banner_top" }  ->  { url } (Stripe Checkout page).
// Needs a signed-in account that owns the installer profile (the same rule as the profile dashboard). The price and the dates come from the server only
// (INSTALLER_PLANS in featured.js, the season rule in sponsor.js); the receipt goes to the account's email. Never touches a contest.
import { json, err, clean } from "../../_lib/util.js";
import { INSTALLER_PLANS, ptToday } from "../../_lib/featured.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { ownsInstaller } from "../../_lib/ownership.js";
import { sponsorWindow, sponsorProblem } from "../../_lib/sponsor.js";
import { sha256hex, checkoutLimit, createCheckoutSession } from "../../_lib/stripe.js";
import { bump } from "../../_lib/funnel.js";

export async function onRequestPost({ request, env }) {
  // Paid placement is web-only (store rules). The UI is hidden in the app too; this is the soft server-side check.
  if (/SoCalLightsApp/.test(request.headers.get("user-agent") || "")) return err(403, "Not available in the app.");
  if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in to pay. Your company and plan will be waiting for you.");
  const b = await request.json().catch(() => null);
  const plan = b && INSTALLER_PLANS[b.plan] ? b.plan : null, slug = clean(b && b.installer, 80);
  if (!plan || !slug) return err(400, "Choose your company profile and a plan.");
  const inst = await env.DB.prepare("SELECT id, slug, name, web, phone, area, email, status, owner_email, banner_until, top_until FROM installers WHERE slug = ?").bind(slug).first();
  // Same answer for "no such profile" and "someone else's profile", so profiles cannot be probed.
  if (!inst || !ownsInstaller(inst, user)) return err(403, "That profile isn't yours. Claim it first: open your company's page and choose \"Claim this profile\".");
  const today = ptToday(), why = sponsorProblem(inst, plan, today);
  if (why) return err(400, why);

  const p = INSTALLER_PLANS[plan], w = sponsorWindow(plan, inst, today), origin = new URL(request.url).origin;
  const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "") ? user.email : ""; // the account email, never one typed in
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(w.cents), // the plan price, prorated by the days left in the season (sponsor.js)
    "line_items[0][price_data][product_data][name]": `Sponsor placement on SoCal Lights: ${inst.name}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": `${p.label} · ${w.from} to ${w.to} (${w.season})${w.prorated ? " · prorated" : ""}`.slice(0, 200),
    "metadata[event_id]": inst.id,
    "metadata[target]": "installer",
    "metadata[plan]": plan,
    "metadata[user_id]": user.id,
    "payment_intent_data[description]": `SoCal Lights Sponsor: ${inst.name} (${plan})`.slice(0, 200),
    success_url: `${origin}/sponsor?paid=1&installer=${encodeURIComponent(inst.slug)}&plan=${plan}`,
    cancel_url: `${origin}/sponsor?cancelled=1&installer=${encodeURIComponent(inst.slug)}&plan=${plan}`,
  });
  if (goodEmail) { f.set("customer_email", goodEmail); f.set("payment_intent_data[receipt_email]", goodEmail); }
  // Same profile + plan + dates within 10 minutes reuses one Checkout session (double clicks). A hash; the account is included so two people never share a session.
  const idem = "sponsor-" + (await sha256hex(`${inst.id}|${plan}|${w.from}|${w.to}|${w.cents}|${user.id}|${Math.floor(Date.now() / 600_000)}`));
  const limited = await checkoutLimit(env, user.id);
  if (limited) return err(429, limited);
  const url = await createCheckoutSession(env, f, idem);
  if (!url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  await bump(env, "fn:sponsor-checkout");
  return json({ url });
}
