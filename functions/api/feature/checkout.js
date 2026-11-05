// POST /api/feature/checkout  { event_id | submission_id, plan: "pin" | "top" | "season" }  ->  { url } (Stripe Checkout page). Needs a signed-in account; the receipt goes to its email.
import { json, err, clean } from "../../_lib/util.js";
import { PLANS, addDays } from "../../_lib/featured.js";
import { requireUser, sameOrigin, normEmail } from "../../_lib/auth.js";
import { ownsEvent } from "../../_lib/ownership.js";

const sha256hex = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function onRequestPost({ request, env }) {
  // Paid placement is web-only (store rules). The UI is hidden in the app too; this is the soft server-side check.
  if (/SoCalLightsApp/.test(request.headers.get("user-agent") || "")) return err(403, "Not available in the app.");
  if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in to pay. Your event and plan will be waiting for you.");
  const b = await request.json().catch(() => null);
  const plan = PLANS[b && b.plan] ? b.plan : null;
  const eventId = clean(b && b.event_id, 60);
  if (!plan) return err(400, "Choose your event and a plan.");
  let ev = null, pending = false;
  const subId = clean(b && b.submission_id, 40);
  if (subId) {
    // An event that was just submitted: attach the payment to the live event if it already published, else hold it until the admin approves.
    const s = await env.DB.prepare("SELECT id, name, city, end_date, event_id, status, contact_email FROM event_submissions WHERE id = ?").bind(subId).first();
    // Same answer as "not found" for someone else's submission, so ids can't be probed.
    if (!s || s.status === "declined" || !normEmail(user.email) || normEmail(s.contact_email) !== normEmail(user.email)) return err(404, "We couldn't find that submission.");
    ev = { id: s.event_id || "sub:" + s.id, name: s.name, city: s.city, end_date: s.end_date }; pending = !s.event_id;
  } else {
    if (!eventId) return err(400, "Choose your event and a plan.");
    ev = await env.DB.prepare("SELECT id, name, city, end_date FROM events WHERE id = ?").bind(eventId).first();
  }
  if (!ev) return err(404, "We couldn't find that event. Search for it again.");
  // Only the owner may pay: they submitted it, hold an approved claim, or run the contest it lists. (A claim gives no edit rights.)
  if (!pending && !(await ownsEvent(env, user, ev.id, ""))) return err(403, "Claim this event first. Only its organizer can feature it.");
  const today = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10);
  if (ev.end_date < today) return err(400, "That event has already ended.");
  // The whole-season plan lasts until the event ends, so it needs real time left (otherwise a $20 plan could last a day).
  if (PLANS[plan].minDays && ev.end_date < addDays(today, PLANS[plan].minDays)) return err(400, `This event ends on ${ev.end_date}, too soon for the whole-season plan (it needs at least ${PLANS[plan].minDays} days left). A 30-day plan is a better fit.`);

  const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "") ? user.email : ""; // the account email, never one typed in
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
    "metadata[user_id]": user.id,
    "payment_intent_data[description]": `SoCal Lights Featured: ${ev.name} (${plan})`.slice(0, 200),
    success_url: `${origin}/feature?paid=1${pending ? "&pending=1" : ""}`,
    // Back to the plan picker with the event and plan still chosen (a pending submission has no public id yet).
    cancel_url: `${origin}/feature?cancelled=1&plan=${plan}${pending ? "" : "&event=" + encodeURIComponent(ev.id)}`,
  });
  if (goodEmail) { f.set("customer_email", goodEmail); f.set("payment_intent_data[receipt_email]", goodEmail); }
  // Same event + plan within 10 minutes reuses one Checkout session (double clicks). The key is a hash (the account is included so two people never share a session).
  const idem = "feature-" + (await sha256hex(`${ev.id}|${plan}|${user.id}|${Math.floor(Date.now() / 600_000)}`));
  // Cap how many payment pages one account can open (card testing, plan rotation): 6 an hour, 20 a day. Counted only here, once every other check passed.
  // If the log cannot be read or written (for example the table is not there yet) the buyer is never blocked.
  try {
    const n = await env.DB.prepare("SELECT SUM(created_at > datetime('now','-1 hour')) AS h, COUNT(*) AS d FROM checkout_log WHERE user_id = ? AND created_at > datetime('now','-1 day')").bind(user.id).first();
    if ((n.h || 0) >= 6) return err(429, "You've opened a lot of payment pages in the last hour. Please wait a little while, or email info@socallights.app if something is wrong.");
    if ((n.d || 0) >= 20) return err(429, "You've opened a lot of payment pages today. Please try again tomorrow, or email info@socallights.app if something is wrong.");
    await env.DB.batch([env.DB.prepare("DELETE FROM checkout_log WHERE created_at < datetime('now','-3 days')"), env.DB.prepare("INSERT INTO checkout_log (user_id) VALUES (?)").bind(user.id)]);
  } catch (e) { console.error("checkout_log", e && e.message); }
  // If Stripe cannot be reached the buyer gets the same friendly message as any other payment-page failure, not a raw error.
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "idempotency-key": idem, "content-type": "application/x-www-form-urlencoded" }, body: f }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  if (!r || !r.ok || !d.url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  return json({ url: d.url });
}
