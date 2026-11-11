// POST /api/feature/checkout  { event_id | submission_id | home_id, plan: "ev_pin" | "ev_banner" | "ev_top" | "ev_all" (events) | "pin" | "top" (a home: podium finishers of an announced contest, 30 days) }  ->  { url } (Stripe Checkout page).
// Needs a signed-in account; the receipt goes to its email. An event's price and dates come from eventQuote (featured.js) and are locked into the payment (metadata quote_*); the old event keys pin / top / season are no longer sold for events.
import { niceYmd } from "../../_lib/money.js";
import { json, err, clean } from "../../_lib/util.js";
import { bump } from "../../_lib/funnel.js";
import { PLANS, EVENT_PLANS, eventQuote } from "../../_lib/featured.js";
import { requireUser, sameOrigin, normEmail } from "../../_lib/auth.js";
import { ownsEvent } from "../../_lib/ownership.js";
import { homeForCheckout, HOME_PLANS, placeWord } from "../../_lib/podium.js";
import { sha256hex, checkoutLimit, createCheckoutSession } from "../../_lib/stripe.js";
import { ptToday } from "../../_lib/time.js";

// True when the dates are the buyer's own: they submitted the event (and can edit it), or it is the map listing of a contest they run.
async function ownSubmission(env, user, eventId) {
  const rows = (await env.DB.prepare("SELECT contact_email FROM event_submissions WHERE event_id = ?").bind(eventId).all()).results;
  if (rows.some((r) => normEmail(r.contact_email) === normEmail(user.email))) return true;
  return !!(await env.DB.prepare("SELECT 1 AS x FROM contests WHERE event_id = ?").bind(eventId).first()); // a contest's map event takes its dates from the contest the organizer runs
}

export async function onRequestPost({ request, env }) {
  // Paid placement is web-only (store rules). The UI is hidden in the app too; this is the soft server-side check.
  if (/SoCalLightsApp/.test(request.headers.get("user-agent") || "")) return err(403, "Not available in the app.");
  if (!env.STRIPE_SECRET_KEY) return err(501, "Online payment isn't set up yet.");
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in to pay. Your event and plan will be waiting for you.");
  const b = await request.json().catch(() => null);
  const plan = b && (EVENT_PLANS[b.plan] || PLANS[b.plan]) ? b.plan : null;
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
    if (s.event_id) { const live = await env.DB.prepare("SELECT notice, featured, featured_until, banner_until FROM events WHERE id = ?").bind(s.event_id).first(); if (live) Object.assign(ev, { notice: live.notice, featured: live.featured, featured_until: live.featured_until, banner_until: live.banner_until }); } // a published submission: its listing may have been marked cancelled or postponed
  } else {
    if (!eventId) return err(400, "Choose your event and a plan.");
    ev = await env.DB.prepare("SELECT id, name, city, start_date, end_date, featured, featured_until, banner_until, notice, status FROM events WHERE id = ?").bind(eventId).first();
  }
  if (!ev) return err(404, "We couldn't find that event. Search for it again.");
  // Only the owner may pay: they submitted it, hold an approved claim, or run the contest it lists. (A claim gives no edit rights.)
  if (!pending && !home && !(await ownsEvent(env, user, ev.id, ""))) return err(403, "Claim this event first. Only its organizer can feature it.");
  const today = ptToday();
  // The Terms promise that a cancelled or postponed event cannot be featured (payments audit M3): refuse here, not only in the page.
  if (!home && (ev.notice === "cancelled" || ev.notice === "postponed")) return err(400, `This event is marked ${ev.notice}, so it cannot be featured. Email info@socallights.app if that is a mistake.`);
  // "Expected" listings carry projected dates that the organizer cannot correct (a claim gives no edit rights), and the paid window is computed from them (audit M8).
  // Hold the sale until the dates are confirmed. An event the buyer submitted themselves has dates they entered and can edit, so it is not held.
  if (!home && !pending && ev.status === "expected" && !(await ownSubmission(env, user, ev.id))) return err(400, "The dates for this listing are still projected, not confirmed, so it can't be featured yet. Email info@socallights.app with a link to your event page and we will confirm the dates; then you can feature it.");
  if (!home && ev.end_date < today) return err(400, "That event has already ended.");
  let q = null;
  if (!home) {
    // Only the current event plans are sold. The window and the price come from eventQuote: featuring opens 30 days before the event, the placement runs to the event's last day or the end of the
    // season (whichever comes first), and the price is for the components the event does not already hold for the whole window. A purchase that adds nothing is refused.
    if (!EVENT_PLANS[plan]) return err(400, "Choose one of the current event plans: Featured pin, Banner + Featured pin, Top of the list + Featured pin, or all three.");
    q = eventQuote(ev, plan, today);
    if (q.problem) return err(400, q.problem);
  }

  const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || "") ? user.email : ""; // the account email, never one typed in
  const p = q || PLANS[plan], origin = new URL(request.url).origin;
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(p.cents), // an event: the quote's price for what it adds; a home: the plan's price. Never from the browser
    "line_items[0][price_data][product_data][name]": `Featured on SoCal Lights: ${ev.name}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": (q ? `${p.label} · ${ev.city} · ${niceYmd(q.from)} to ${niceYmd(q.to)} (${q.season} season${q.capped === "event" ? ", your event's last day" : ""})${q.added.length < q.components.length ? " · adds " + q.added.join(", ") : ""}` : `${p.label} · ${ev.city}${home ? " · " + placeWord(home.standing.place) + ": " + home.row.cname : ""}`).slice(0, 200),
    "metadata[event_id]": ev.id,
    ...(home ? { "metadata[target]": "home" } : {}),
    ...(q ? { "metadata[quote_from]": q.from, "metadata[quote_to]": q.to, "metadata[quote_cents]": String(q.cents) } : {}), // what the buyer was quoted: the webhook applies this window and checks the amount against it
    "metadata[plan]": plan,
    "metadata[user_id]": user.id,
    "payment_intent_data[description]": `SoCal Lights Featured: ${ev.name} (${plan})`.slice(0, 200),
    // Back to the same page: the success view names the event and plan; a cancel keeps both chosen (a pending submission goes by its submission id).
    success_url: `${origin}/feature?paid=1&plan=${plan}${home ? "&home=1" : pending ? "&sub=" + encodeURIComponent(subId) : "&event=" + encodeURIComponent(ev.id)}`,
    cancel_url: `${origin}/feature?cancelled=1&plan=${plan}${pending ? "&sub=" + encodeURIComponent(subId) : (home ? "&home=" : "&event=") + encodeURIComponent(ev.id)}`,
  });
  if (goodEmail) { f.set("customer_email", goodEmail); f.set("payment_intent_data[receipt_email]", goodEmail); }
  // Same event + plan within 10 minutes reuses one Checkout session (double clicks). The key is a hash (the account is included so two people never share a session).
  const idem = "feature-" + (await sha256hex(`${ev.id}|${plan}|${q ? q.to + "|" + q.cents + "|" : ""}${user.id}|${Math.floor(Date.now() / 600_000)}`));
  const limited = await checkoutLimit(env, user.id); // 6 payment pages an hour, 20 a day per account; counted only once every other check passed
  if (limited) return err(429, limited);
  // If Stripe cannot be reached the buyer gets the same friendly message as any other payment-page failure, not a raw error.
  const url = await createCheckoutSession(env, f, idem);
  if (!url) return err(502, "The payment page couldn't be opened. Please try again in a moment.");
  if (!home) await bump(env, "fn:event-feature-checkout"); // a number only: payment pages opened for an event
  return json({ url });
}
