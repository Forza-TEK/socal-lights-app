// POST /api/contest-pass/checkout  { plan: "pass_5" | "pass_10" | "pass_20", site?, back? }  ->  { url } (Stripe Checkout page).
// Needs a signed-in account. The organization, the window, the cap and the price come from the server only (passes.js) and are locked into the payment (metadata quote_*): the webhook
// applies exactly that, checks the amount against it, and holds the order as refund due if the window changed or the organization already holds this much.
// Same shape as /api/sponsor/checkout. Never touches a contest, a vote or a result.
import { json, err, clean } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { keyForUser } from "../../_lib/passkey.js";
import { orgState, passQuote, CONTEST_PASSES, orgLabel } from "../../_lib/passes.js";
import { sha256hex, checkoutLimit, createCheckoutSession } from "../../_lib/stripe.js";
import { bump } from "../../_lib/funnel.js";

// Where the buyer lands after Stripe: back = "wizard" (it creates the contest by itself), "manage:<slug>" (a contest dashboard) or the pass page. Never an outside address.
const backPath = (b, site) => (b === "wizard" ? "/add-contest?resume=1" : /^manage:[a-z0-9-]{1,60}$/.test(String(b)) ? `/c/${String(b).slice(7)}/manage` : "/contest-pass" + (site ? "?site=" + encodeURIComponent(site) : ""));

export async function onRequestPost({ request, env }) {
  // Paid placement is web-only (store rules). The UI is hidden in the app too; this is the soft server-side check.
  if (/SoCalLightsApp/.test(request.headers.get("user-agent") || "")) return err(403, "Not available in the app.");
  if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in to pay. Your contest and pass will be waiting for you.");
  const b = await request.json().catch(() => null), plan = b && CONTEST_PASSES[b.plan] ? b.plan : null;
  if (!plan) return err(400, "Choose a pass.");
  const key = await keyForUser(env, user, b && b.site !== undefined && b.site !== null ? clean(b.site, 200) : null), ent = await orgState(env, key), q = passQuote(ent, plan);
  if (q.problem) return err(400, q.problem);

  const p = CONTEST_PASSES[plan], origin = new URL(request.url).origin, back = backPath(b.back, b.site ? clean(b.site, 200) : ""), sep = back.includes("?") ? "&" : "?";
  const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "") ? user.email : ""; // the account email, never one typed in
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(q.cents), // the pass price, or the difference for an upgrade (passes.js); never from the browser
    "line_items[0][price_data][product_data][name]": `Contest pass on SoCal Lights: ${orgLabel(key)}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": `${p.label} · ${q.from} to ${q.to}${q.upgrade ? " · upgrade (the difference)" : ""}`.slice(0, 200),
    "metadata[event_id]": key, // the organization key (the shared metadata name every placement uses)
    "metadata[target]": "contest_pass",
    "metadata[plan]": plan,
    "metadata[user_id]": user.id,
    "metadata[quote_from]": q.from, "metadata[quote_to]": q.to, "metadata[quote_cents]": String(q.cents), // what the buyer was quoted
    "payment_intent_data[description]": `SoCal Lights contest pass: ${orgLabel(key)} (${plan})`.slice(0, 200),
    success_url: `${origin}${back}${sep}pass=paid&plan=${plan}`,
    cancel_url: `${origin}${back}${sep}pass=cancelled&plan=${plan}`,
  });
  if (goodEmail) { f.set("customer_email", goodEmail); f.set("payment_intent_data[receipt_email]", goodEmail); }
  // Same organization + pass + window + price within 10 minutes reuses one Checkout session (double clicks). A hash; the account is included so two people never share a session.
  const idem = "pass-" + (await sha256hex(`${key}|${plan}|${q.from}|${q.to}|${q.cents}|${user.id}|${Math.floor(Date.now() / 600_000)}`));
  const limited = await checkoutLimit(env, user.id);
  if (limited) return err(429, limited);
  const url = await createCheckoutSession(env, f, idem);
  if (!url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  return json({ url });
}
