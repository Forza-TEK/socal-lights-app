// POST /api/partner/checkout  { site? }  ->  { url } (Stripe Checkout page) for the Event Partner plan of the signed-in person's organization, this season.
// The price, the season dates and the organization come from the server only (partner.js) and are locked into the payment (metadata quote_*): the webhook applies exactly that.
// A comp or a plan already held means nothing to buy (400). Same shape as /api/contest-pass/checkout.
import { json, err, clean } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { partnerKey } from "../../_lib/partnerapply.js";
import { partnerState, partnerQuote, EVENT_PARTNER, PARTNER_PLAN } from "../../_lib/partner.js";
import { orgLabel } from "../../_lib/passes.js";
import { sha256hex, checkoutLimit, createCheckoutSession } from "../../_lib/stripe.js";
import { ptToday } from "../../_lib/time.js";
import { bump } from "../../_lib/funnel.js";

export async function onRequestPost({ request, env }) {
  if (/SoCalLightsApp/.test(request.headers.get("user-agent") || "")) return err(403, "Not available in the app.");
  if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in to pay. Your organization will be waiting for you.");
  const b = (await request.json().catch(() => null)) || {};
  const key = await partnerKey(env, user, clean(b.site, 200)), today = ptToday(), q = partnerQuote(await partnerState(env, key, today), today);
  if (q.problem) return err(400, q.problem);
  const origin = new URL(request.url).origin, goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "") ? user.email : "";
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(q.cents), // from partner.js; never from the browser
    "line_items[0][price_data][product_data][name]": `Event Partner on SoCal Lights: ${orgLabel(key)}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": `Up to ${EVENT_PARTNER.cap} events · ${q.season} season · ${q.from} to ${q.to}`.slice(0, 200),
    "metadata[event_id]": key, "metadata[target]": "event_partner", "metadata[plan]": PARTNER_PLAN, "metadata[user_id]": user.id,
    "metadata[quote_from]": q.from, "metadata[quote_to]": q.to, "metadata[quote_cents]": String(q.cents),
    "payment_intent_data[description]": `SoCal Lights Event Partner: ${orgLabel(key)}`.slice(0, 200),
    success_url: `${origin}/partner?paid=1`,
    cancel_url: `${origin}/partner?cancelled=1`,
  });
  if (goodEmail) { f.set("customer_email", goodEmail); f.set("payment_intent_data[receipt_email]", goodEmail); }
  const idem = "partner-" + (await sha256hex(`${key}|${q.from}|${q.to}|${q.cents}|${user.id}|${Math.floor(Date.now() / 600_000)}`));
  const limited = await checkoutLimit(env, user.id);
  if (limited) return err(429, limited);
  const url = await createCheckoutSession(env, f, idem);
  if (!url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  await bump(env, "fn:partner-checkout");
  return json({ url });
}
