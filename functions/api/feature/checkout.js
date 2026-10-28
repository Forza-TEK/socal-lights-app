// POST /api/feature/checkout  { event_id, plan: "pin" | "top" | "season" }  ->  { url } (Stripe Checkout page)
import { json, err, clean } from "../../_lib/util.js";
import { PLANS } from "../../_lib/featured.js";

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
  const b = await request.json().catch(() => null);
  const plan = PLANS[b && b.plan] ? b.plan : null;
  const eventId = clean(b && b.event_id, 60);
  if (!plan) return err(400, "Choose your event and a plan.");
  let ev = null, pending = false;
  const subId = clean(b && b.submission_id, 40);
  if (subId) {
    // An event that was just submitted: attach the payment to the live event if it already published, else hold it until the admin approves.
    const s = await env.DB.prepare("SELECT id, name, city, end_date, event_id, status FROM event_submissions WHERE id = ?").bind(subId).first();
    if (!s || s.status === "declined") return err(404, "We couldn't find that submission.");
    ev = { id: s.event_id || "sub:" + s.id, name: s.name, city: s.city, end_date: s.end_date }; pending = !s.event_id;
  } else {
    if (!eventId) return err(400, "Choose your event and a plan.");
    ev = await env.DB.prepare("SELECT id, name, city, end_date FROM events WHERE id = ?").bind(eventId).first();
  }
  if (!ev) return err(404, "We couldn't find that event. Search for it again.");
  const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10);
  if (ev.end_date < today) return err(400, "That event has already ended.");

  const p = PLANS[plan], origin = new URL(request.url).origin;
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(p.cents),
    "line_items[0][price_data][product_data][name]": `Featured on SoCal Lights: ${ev.name}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": `${p.label} · ${ev.city}`.slice(0, 200),
    "metadata[event_id]": ev.id,
    "metadata[plan]": plan,
    "payment_intent_data[description]": `SoCal Lights Featured: ${ev.name} (${plan})`.slice(0, 200),
    success_url: `${origin}/feature?paid=1${pending ? "&pending=1" : ""}`,
    cancel_url: `${origin}/feature`,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body: f });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  return json({ url: d.url });
}
