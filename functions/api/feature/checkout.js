// POST /api/feature/checkout  { event_id | submission_id | home_id, plan: "pin" | "top" | "season" (shown as "Full run", events only) }  (a home: "pin" | "top" only, podium finishers of an announced contest)  ->  { url } (Stripe Checkout page). Needs a signed-in account; the receipt goes to its email.
import { json, err, clean } from "../../_lib/util.js";
import { bump } from "../../_lib/funnel.js";
import { PLANS, applyPlan, eventPlanProblem } from "../../_lib/featured.js";
import { requireUser, sameOrigin, normEmail } from "../../_lib/auth.js";
import { ownsEvent } from "../../_lib/ownership.js";
import { homeForCheckout, HOME_PLANS, placeWord } from "../../_lib/podium.js";
import { sha256hex, checkoutLimit, createCheckoutSession } from "../../_lib/stripe.js";
import { ptToday } from "../../_lib/time.js";

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
  let ev = null, pending = false, home = null;
  const subId = clean(b && b.submission_id, 40), homeId = clean(b && b.home_id, 60);
  if (homeId) {
    // A home: only the winner, 2nd or 3rd place of an announced contest (read from the frozen results), and only its owner. Payment never touches the contest.
    if (!HOME_PLANS.includes(plan)) return err(400, "Homes can be featured for 30 days: choose the featured pin or top of the list.");
    const h = await homeForCheckout(env, user, homeId);
    if (h.error) return err(h.status, h.error);
    home = h; ev = { id: h.row.id, name: h.row.title, city: h.row.city, end_date: "9999-12-31" };
  } else if (subId) {
    // An event that was just submitted: attach the payment to the live event if it already published, else hold it until the admin approves.
    const s = await env.DB.prepare("SELECT id, name, city, start_date, end_date, event_id, status, contact_email FROM event_submissions WHERE id = ?").bind(subId).first();
    // Same answer as "not found" for someone else's submission, so ids can't be probed.
    if (!s || s.status === "declined" || !normEmail(user.email) || normEmail(s.contact_email) !== normEmail(user.email)) return err(404, "We couldn't find that submission.");
    ev = { id: s.event_id || "sub:" + s.id, name: s.name, city: s.city, start_date: s.start_date, end_date: s.end_date }; pending = !s.event_id;
  } else {
    if (!eventId) return err(400, "Choose your event and a plan.");
    ev = await env.DB.prepare("SELECT id, name, city, start_date, end_date, featured, featured_until FROM events WHERE id = ?").bind(eventId).first();
  }
  if (!ev) return err(404, "We couldn't find that event. Search for it again.");
  // Only the owner may pay: they submitted it, hold an approved claim, or run the contest it lists. (A claim gives no edit rights.)
  if (!pending && !home && !(await ownsEvent(env, user, ev.id, ""))) return err(403, "Claim this event first. Only its organizer can feature it.");
  const today = ptToday();
  if (!home && ev.end_date < today) return err(400, "That event has already ended.");
  if (!home) {
    // The window follows the event: featuring opens 30 days before it starts; the Full run plan needs a long event with time left.
    const why = eventPlanProblem(ev, plan, today);
    if (why) return err(400, why);
    // A repeat purchase must buy something: a higher level, or time beyond what already runs (the cap, not the event's last day, is the limit).
    if (ev.featured != null) {
      const nf = applyPlan(ev, plan, today), running = ev.featured && (!ev.featured_until || ev.featured_until >= today);
      if (running && nf.featured <= ev.featured && ev.featured_until && ev.featured_until >= nf.featured_until)
        return err(400, `This event is already featured through ${ev.featured_until}, as far as this plan can reach (your event's last day or ${PLANS[plan].days || PLANS[plan].maxDays} days from payment). Nothing to add yet.`);
    }
  }

  const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "") ? user.email : ""; // the account email, never one typed in
  const p = PLANS[plan], origin = new URL(request.url).origin;
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(p.cents),
    "line_items[0][price_data][product_data][name]": `Featured on SoCal Lights: ${ev.name}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": `${p.label} · ${ev.city}${home ? " · " + placeWord(home.standing.place) + ": " + home.row.cname : ""}`.slice(0, 200),
    "metadata[event_id]": ev.id,
    ...(home ? { "metadata[target]": "home" } : {}),
    "metadata[plan]": plan,
    "metadata[user_id]": user.id,
    "payment_intent_data[description]": `SoCal Lights Featured: ${ev.name} (${plan})`.slice(0, 200),
    // Back to the same page: the success view names the event and plan; a cancel keeps both chosen (a pending submission goes by its submission id).
    success_url: `${origin}/feature?paid=1&plan=${plan}${home ? "&home=1" : pending ? "&sub=" + encodeURIComponent(subId) : "&event=" + encodeURIComponent(ev.id)}`,
    cancel_url: `${origin}/feature?cancelled=1&plan=${plan}${pending ? "&sub=" + encodeURIComponent(subId) : (home ? "&home=" : "&event=") + encodeURIComponent(ev.id)}`,
  });
  if (goodEmail) { f.set("customer_email", goodEmail); f.set("payment_intent_data[receipt_email]", goodEmail); }
  // Same event + plan within 10 minutes reuses one Checkout session (double clicks). The key is a hash (the account is included so two people never share a session).
  const idem = "feature-" + (await sha256hex(`${ev.id}|${plan}|${user.id}|${Math.floor(Date.now() / 600_000)}`));
  const limited = await checkoutLimit(env, user.id); // 6 payment pages an hour, 20 a day per account; counted only once every other check passed
  if (limited) return err(429, limited);
  // If Stripe cannot be reached the buyer gets the same friendly message as any other payment-page failure, not a raw error.
  const url = await createCheckoutSession(env, f, idem);
  if (!url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  if (!home) await bump(env, "fn:event-feature-checkout"); // a number only: payment pages opened for an event
  return json({ url });
}
