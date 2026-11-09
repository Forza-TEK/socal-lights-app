// POST /api/stripe-webhook — Stripe tells us about Featured payments; we switch the placement on, and off again on refund/dispute.
// Set up in Stripe: Developers > Webhooks > endpoint https://socallights.app/api/stripe-webhook, events checkout.session.completed,
// checkout.session.async_payment_succeeded, checkout.session.expired, charge.refunded, charge.dispute.created, charge.dispute.closed,
// then store its signing secret as STRIPE_WEBHOOK_SECRET.
//
// Retry safety: nothing is "done" until it has really been applied. The order row records `applied`; the Stripe event id is written to
// stripe_events only after the work succeeded; failures that a retry can fix return 500 so Stripe redelivers.
import { json, err } from "../_lib/util.js";
import { logOp, logOpOnce } from "../_lib/oplog.js";
import { bump } from "../_lib/funnel.js";
import { sendFeaturePaidEmail } from "../_lib/featuremail.js";
import { sponsorWindow } from "../_lib/sponsor.js";
import { passOf, quoteProblem } from "../_lib/passes.js";
import { sendPassPaidEmail } from "../_lib/passmail.js";
import { EVENT_PARTNER, partnerQuoteProblem } from "../_lib/partner.js";
import { sendPartnerPaidEmail } from "../_lib/partnermail.js";
import { sponsorEmails } from "../_lib/sponsormail.js";
import { enrollRenewal, pauseOnRevoke } from "../_lib/renewal.js";
import { stripeCall } from "../_lib/stripe.js";
import { PLANS, INSTALLER_PLANS, EVENT_PLANS, ptToday, LEGACY_SEASON_CENTS, applyOrder, eventQuote, verifyStripeSignature, revokePlan, setOrderNote, AUTO } from "../_lib/featured.js";

const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired", "charge.refunded", "charge.dispute.created", "charge.dispute.closed", "payment_intent.succeeded"]);

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const sigHeader = request.headers.get("stripe-signature");
  if (!(await verifyStripeSignature(raw, sigHeader, env.STRIPE_WEBHOOK_SECRET))) {
    // A wrong or missing signing secret makes every real Stripe delivery fail here, so the cause is filed (once an hour per cause, nothing from the request itself) and the digest shows it.
    await logOpOnce(env, "webhook", `Stripe webhook rejected: ${signatureProblem(sigHeader, env.STRIPE_WEBHOOK_SECRET)}`, 60);
    return err(400, "Bad signature.");
  }
  let evt; try { evt = JSON.parse(raw); } catch { return err(400, "Bad payload."); }
  if (!evt || !evt.id || !HANDLED.has(evt.type)) return json({ ok: true, ignored: evt && evt.type });

  if (await env.DB.prepare("SELECT 1 FROM stripe_events WHERE id = ?").bind(evt.id).first()) return json({ ok: true, duplicate: true });

  let res;
  try { res = await handle(evt, env); } catch (e) { console.error("stripe-webhook", evt.type, evt.id, e && e.message); await logOp(env, "webhook", `${evt.type} ${evt.id}: ${e && e.message}`); return err(500, "Could not process; please retry."); }
  if (res instanceof Response) { if (res.status >= 500) await logOp(env, "webhook", `${evt.type} ${evt.id}: answered ${res.status}, Stripe will retry`); return res; } // a retryable failure: leave the event unrecorded so Stripe redelivers
  await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id,type) VALUES (?,?)").bind(evt.id, evt.type).run();
  return json({ ok: true, ...res });
}

// Why a signature failed, in words only (never the header, the body or the secret): the owner can tell a missing STRIPE_WEBHOOK_SECRET from a wrong one.
export function signatureProblem(header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret) return "STRIPE_WEBHOOK_SECRET is not set in Cloudflare Pages, so every delivery fails";
  if (!header) return "no stripe-signature header (not sent by Stripe)";
  const t = Number((String(header).match(/(?:^|,)\s*t=(\d+)/) || [])[1]), hasV1 = /(?:^|,)\s*v1=/.test(header);
  if (!t || !hasV1) return "malformed stripe-signature header (not sent by Stripe)";
  if (Math.abs(nowSec - t) > 300) return "signature timestamp more than 5 minutes off (a replay, or the clock)";
  return "signature does not match: the signing secret (STRIPE_WEBHOOK_SECRET) is probably not the one shown for this endpoint in Stripe, or the body was altered";
}

async function handle(evt, env) {
  const o = (evt.data && evt.data.object) || {};
  switch (evt.type) {
    case "checkout.session.completed":
      if (o.mode === "setup") return setupDone(o, env); // a saved card for automatic renewal, no payment
      return paid(o, env);
    case "checkout.session.async_payment_succeeded": return paid(o, env);
    case "payment_intent.succeeded": // an automatic renewal charge (the daily job also records it; the order is keyed by the PaymentIntent id, so it is recorded once). Checkout payments are handled by their session.
      return o.metadata && o.metadata.renewal === "1" ? paid({ id: o.id, payment_status: "paid", amount_total: o.amount_received || o.amount, currency: o.currency, payment_intent: o.id, customer_details: { email: o.receipt_email || "" }, metadata: o.metadata }, env) : { ignored: "not a renewal charge" };
    case "checkout.session.expired": return { expired: o.id || null }; // abandoned checkout: recorded in stripe_events only
    case "charge.refunded": {
      const order = await orderByPi(env, o.payment_intent);
      if (!order) return pendingRevocation(env, o.payment_intent, o.refunded === true ? "refunded" : "held");
      await env.DB.prepare("UPDATE feature_orders SET charge_id = ? WHERE session_id = ?").bind(o.id || null, order.session_id).run();
      await pauseOnRevoke(env, order, o.refunded === true ? "refunded" : "partly refunded"); // an automatic renewal stops until the installer turns it on again
      if (o.refunded !== true) { // partial refund: flag it, the admin decides
        const h = await env.DB.prepare("UPDATE feature_orders SET status = 'held' WHERE session_id = ? AND status = 'paid'").bind(order.session_id).run();
        if (h.meta && h.meta.changes) await setOrderNote(env.DB, order.session_id, AUTO + "partial refund: the placement was left on. Decide in Stripe whether to refund the rest, then mark it refunded here.");
        return { held: "partial refund" };
      }
      return revoked(await revokePlan(env.DB, order, "refunded"));
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      let pi = o.payment_intent;
      if (!pi && o.charge) {
        const known = await env.DB.prepare("SELECT payment_intent FROM feature_orders WHERE charge_id = ?").bind(o.charge).first();
        pi = known && known.payment_intent;
        if (!pi && env.STRIPE_SECRET_KEY) { // the dispute names only its charge: ask Stripe which payment it belongs to
          const r = await fetch("https://api.stripe.com/v1/charges/" + encodeURIComponent(o.charge), { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
          if (!r.ok) return err(502, "Could not look up the charge.");
          pi = (await r.json().catch(() => ({}))).payment_intent;
        }
      }
      const order = await orderByPi(env, pi);
      if (!order) return pendingRevocation(env, pi, evt.type === "charge.dispute.closed" && o.status === "won" ? "dispute_won" : evt.type === "charge.dispute.closed" && o.status !== "lost" ? null : "disputed");
      if (o.charge) await env.DB.prepare("UPDATE feature_orders SET charge_id = ? WHERE session_id = ?").bind(o.charge, order.session_id).run();
      if (evt.type === "charge.dispute.created" || o.status === "lost") await pauseOnRevoke(env, order, "disputed");
      if (evt.type === "charge.dispute.closed") {
        if (o.status === "won") { await env.DB.prepare("UPDATE feature_orders SET status = 'dispute_won', note = ? WHERE session_id = ?").bind(AUTO + "dispute won: the placement stays off. Re-grant it by hand if you want to.", order.session_id).run(); return { dispute: "won", manual: "re-grant by hand if wanted" }; }
        if (o.status !== "lost") return { ignored: "dispute closed: " + o.status };
      }
      return revoked(await revokePlan(env.DB, order, "disputed"));
    }
  }
}

// A refund or dispute can reach us before the checkout event that creates its order. Remember it; paid() then creates the order already
// refunded/disputed and never switches the placement on. Without a payment intent there is nothing to key it by.
async function pendingRevocation(env, pi, kind) {
  if (!pi || !kind) return { ignored: "no matching order" };
  await env.DB.prepare("INSERT INTO feature_pending_revocations (payment_intent, kind) VALUES (?, ?) ON CONFLICT(payment_intent) DO UPDATE SET kind = excluded.kind").bind(pi, kind).run();
  return { pending: kind, note: "no order yet; recorded for when it arrives" };
}
const revoked = (manual) => (manual ? { revoked: false, manual: "placement differs" } : { revoked: true });
const orderByPi = (env, pi) => (pi ? env.DB.prepare("SELECT * FROM feature_orders WHERE payment_intent = ?").bind(pi).first() : null);

async function paid(s, env) {
  if (s.payment_status !== "paid") return { waiting: s.payment_status }; // e.g. a delayed method; Stripe sends async_payment_succeeded later
  const eventId = s.metadata && s.metadata.event_id, plan = s.metadata && s.metadata.plan;
  const mt = s.metadata && s.metadata.target, target = mt === "home" ? "home" : mt === "installer" ? "installer" : mt === "contest_pass" ? "contest_pass" : mt === "event_partner" ? "event_partner" : "event"; // a home (podium finisher) and an installer's Sponsor placement are bought through the same orders
  const tier = target === "event" && !!EVENT_PLANS[plan]; // one of the new event tiers (ev_pin, ev_banner, ev_top, ev_all); the old keys pin / top / season are grandfathered below
  const price = target === "event_partner" ? (plan === "partner" ? EVENT_PARTNER : null) : target === "contest_pass" ? passOf(plan) : target === "installer" ? INSTALLER_PLANS[plan] : tier ? EVENT_PLANS[plan] : PLANS[plan];
  if (!eventId || !price) return { ignored: "no feature metadata" };
  if (target === "home" && !PLANS[plan].days) return { ignored: "no Full run plan for homes" };

  // One order per Checkout session. The row existing is NOT proof the placement was applied; `applied` is.
  const pi = (typeof s.payment_intent === "string" && s.payment_intent) || null;
  let status = "paid"; const notes = [];
  let expected = price.cents; // an installer's price is the plan's price, or the difference for an upgrade: the same server calculation the checkout used
  let quoteChanged = "", quote = null, dupe = "";
  const m = s.metadata || {}, hasQuote = /^\d{4}-\d{2}-\d{2}$/.test(m.quote_from || "") && /^\d{4}-\d{2}-\d{2}$/.test(m.quote_to || "") && /^\d+$/.test(String(m.quote_cents || ""));
  if (target === "installer") {
    const inst = await env.DB.prepare("SELECT banner_until, top_until FROM installers WHERE id = ?").bind(eventId).first(), w = inst ? sponsorWindow(plan, inst, ptToday()) : null;
    if (w) expected = w.cents;
    if (hasQuote) { // the buyer was quoted these dates and this price at checkout: that is what they paid for
      quote = { from: m.quote_from, to: m.quote_to, cents: Number(m.quote_cents) }; expected = quote.cents;
      if (w && (w.to !== quote.to || w.cents !== quote.cents)) quoteChanged = `quoted ${quote.from} to ${quote.to} for ${(quote.cents / 100).toFixed(2)} USD, but the placement would now run ${w.from} to ${w.to} for ${(w.cents / 100).toFixed(2)} USD`;
    }
  } else if (tier) {
    // An event tier: the quote (dates and price) was locked at checkout. The paid amount is checked against it; with no quote (a hand-made order) against the same server calculation as of now.
    if (hasQuote) { quote = { from: m.quote_from, to: m.quote_to, cents: Number(m.quote_cents) }; expected = quote.cents; }
    if (!eventId.startsWith("sub:")) {
      const ev = await env.DB.prepare("SELECT start_date, end_date, featured, featured_until, banner_until FROM events WHERE id = ?").bind(eventId).first();
      if (ev) { const q = eventQuote(ev, plan, ptToday()); if (!hasQuote) expected = q.cents || price.cents; if (!q.added.length && q.problem.startsWith("Nothing to add")) dupe = q.problem; }
    }
  }
  if (target === "contest_pass") {
    // A contest pass: eventId is the organization key. The quote (window dates, pass, price) was locked at checkout and the paid amount is checked against it. A pass bought for a window that has
    // changed, or for an organization that already holds this much (second tab, duplicate session), is held as refund due instead of being applied twice.
    if (!hasQuote) return { ignored: "no pass quote" };
    quote = { from: m.quote_from, to: m.quote_to, cents: Number(m.quote_cents) }; expected = quote.cents;
    if (!(await env.DB.prepare("SELECT 1 FROM feature_orders WHERE session_id = ?").bind(s.id).first())) { const why = await quoteProblem(env, { event_id: eventId, plan, quote_from: quote.from, quote_to: quote.to }); if (why) quoteChanged = why; }
  }
  if (target === "event_partner") {
    // An Event Partner plan: eventId is the organization key. Same handling as a contest pass: the quote (season dates, price) was locked at checkout, the paid amount is checked against it, and a plan bought
    // for a season that changed, or by an organization that already holds one or is under a comp (second tab, duplicate session), is held as refund due instead of being applied twice.
    if (!hasQuote) return { ignored: "no partner quote" };
    quote = { from: m.quote_from, to: m.quote_to, cents: Number(m.quote_cents) }; expected = quote.cents;
    if (!(await env.DB.prepare("SELECT 1 FROM feature_orders WHERE session_id = ?").bind(s.id).first())) { const why = await partnerQuoteProblem(env, { event_id: eventId, quote_from: quote.from, quote_to: quote.to }); if (why) quoteChanged = why; }
  }
  const exists = await env.DB.prepare("SELECT 1 FROM feature_orders WHERE session_id = ?").bind(s.id).first();
  if (!exists && pi) { // did a refund or dispute for this payment already arrive?
    const pend = await env.DB.prepare("SELECT kind FROM feature_pending_revocations WHERE payment_intent = ?").bind(pi).first();
    if (pend) { status = pend.kind; notes.push(`${AUTO}${{ refunded: "a refund", held: "a partial refund", disputed: "a dispute", dispute_won: "a dispute (won)" }[pend.kind] || pend.kind} reached us before the payment was recorded, so the placement was not applied.`); }
  }
  if ((s.amount_total !== expected && !(target === "event" && plan === "season" && s.amount_total === LEGACY_SEASON_CENTS)) || String(s.currency || "").toLowerCase() !== "usd") // the buyer paid what we asked at checkout: still apply, but flag it
    notes.push(`${AUTO}amount mismatch: paid ${s.amount_total == null ? "?" : (s.amount_total / 100).toFixed(2)} ${String(s.currency || "?").toUpperCase()}, the ${plan} plan is ${(expected / 100).toFixed(2)} USD.`);
  if (!exists && status === "paid" && quoteChanged) { // another payment already bought these dates (a second tab, a duplicate session) or the state changed: never double-book silently
    status = "refund_due"; notes.push(`${AUTO}quote changed: ${quoteChanged}. It was NOT applied. Refund it in Stripe, or apply what is right by hand, then mark it refunded.`);
  }
  if (!exists && status === "paid" && dupe) { // another order already gave the event everything this one buys (a second tab, a duplicate session): never double-book silently
    status = "refund_due"; notes.push(`${AUTO}nothing new: ${dupe} It was NOT applied. Refund it in Stripe, or apply what is right by hand, then mark it refunded.`);
  }
  await env.DB.prepare("INSERT OR IGNORE INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,user_id,note,target,refunded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CASE WHEN ? = 'paid' THEN NULL ELSE datetime('now') END)")
    .bind(s.id, eventId, plan, s.amount_total ?? null, (s.customer_details && s.customer_details.email) || "", pi, s.currency || null, status, (s.metadata && s.metadata.user_id) || null, notes.join(" ").slice(0, 500) || null, target, status).run();
  if (!exists && status !== "paid") await env.DB.prepare("DELETE FROM feature_pending_revocations WHERE payment_intent = ?").bind(pi).run();
  if (!exists && quote) await env.DB.prepare("UPDATE feature_orders SET quote_from = ?, quote_to = ? WHERE session_id = ?").bind(quote.from, quote.to, s.id).run();
  if (!exists && target === "installer" && s.metadata.renewal === "1") await env.DB.prepare("UPDATE feature_orders SET renewal = 1 WHERE session_id = ?").bind(s.id).run(); // an automatic charge: Admin > Orders marks it, a refund or dispute pauses the renewal
  const order = await env.DB.prepare("SELECT * FROM feature_orders WHERE session_id = ?").bind(s.id).first();
  if (order.applied) { // a replay: the placement is on. Saving the card for renewal is idempotent, so a retry that failed after applying still completes it.
    if (target === "installer" && s.metadata.renew === "1") { const e = await enrollFromSession(s, order, env); if (e instanceof Response) return e; }
    return { duplicate: true };
  }
  if (order.status !== "paid") return { skipped: order.status }; // already refunded/disputed before we got to apply it
  if (!order.payment_intent && typeof s.payment_intent === "string") await env.DB.prepare("UPDATE feature_orders SET payment_intent = ? WHERE session_id = ?").bind(s.payment_intent, s.id).run();

  if (!exists && target === "event") await bump(env, "fn:event-feature-paid"); // a number only; counted here, never from the browser
  let targetId = order.event_id;
  if (targetId.startsWith("sub:")) {
    // Paid while the event was still waiting for review: apply now if it has since published, otherwise the admin's approval applies it.
    const sub = await env.DB.prepare("SELECT event_id FROM event_submissions WHERE id = ?").bind(targetId.slice(4)).first();
    if (!sub) { console.error("stripe-webhook: submission not found", targetId); return err(500, "Submission not found; will retry."); }
    if (!sub.event_id) {
      if (!exists && target === "event") { const q = await env.DB.prepare("SELECT name, contact_email FROM event_submissions WHERE id = ?").bind(targetId.slice(4)).first(); await sendFeaturePaidEmail(env, { order, name: q && q.name, waiting: true, fallbackEmail: q && q.contact_email }); }
      return { held: "waiting for the event to be approved" };
    }
    targetId = sub.event_id;
    await env.DB.prepare("UPDATE feature_orders SET event_id = ? WHERE session_id = ?").bind(targetId, s.id).run();
  }
  const nf = await applyOrder(env.DB, order, targetId);
  if (!nf) { console.error("stripe-webhook: target not found", targetId); return err(500, (target === "home" ? "Home" : target === "installer" ? "Installer profile" : "Event") + " not found; will retry."); }
  if (target === "event_partner") {
    await bump(env, "fn:partner-paid"); await sendPartnerPaidEmail(env, order, nf, s.amount_total); // once: a replay returns "duplicate" above
    return { partner: nf };
  }
  if (target === "contest_pass") {
    await bump(env, "fn:pass-paid"); await sendPassPaidEmail(env, order, nf, s.amount_total); // a number only, and one email, once: a replay returns "duplicate" above
    return { pass: nf };
  }
  if (target === "installer") {
    await bump(env, "fn:sponsor-paid"); await sponsorEmails(env, order, nf, s, s.metadata.renewal === "1");
    if (s.metadata.renew === "1") { const e = await enrollFromSession(s, order, env); if (e instanceof Response) return e; } // the buyer ticked "renew automatically"
    return { sponsor: nf };
  } // counted and mailed once: a replay returns "duplicate" above
  if (target === "event") { const q = await env.DB.prepare("SELECT name FROM events WHERE id = ?").bind(targetId).first(); await sendFeaturePaidEmail(env, { order, name: q && q.name, until: nf.featured_until, eventId: targetId }); }
  return { featured: nf };
}

// Used by the daily renewal job to record a charge it just made, through the same path as a webhook.
export { paid as applyPaid };

// The buyer ticked the (unticked-by-default) renewal box at Checkout: save the card Stripe kept for later and turn renewal on. Only Stripe ids are stored.
async function enrollFromSession(s, order, env) {
  const customer = typeof s.customer === "string" ? s.customer : "", pi = typeof s.payment_intent === "string" ? s.payment_intent : "";
  if (!customer || !pi) return { skipped: "no saved card" };
  const r = await stripeCall(env, "GET", "/v1/payment_intents/" + encodeURIComponent(pi));
  const pm = r.ok && r.data && (typeof r.data.payment_method === "string" ? r.data.payment_method : r.data.payment_method && r.data.payment_method.id);
  if (!pm) return err(502, "Could not read the saved card; will retry.");
  await enrollRenewal(env, { installerId: order.event_id, userId: s.metadata.user_id, customer, paymentMethod: pm, plan: order.plan, sessionId: s.id, paidCents: order.amount, version: s.metadata.consent });
  return null;
}

// A setup-mode Checkout from the installer dashboard ("Turn on automatic renewal"): save the card and turn renewal on for the plan that is running.
async function setupDone(s, env) {
  if (!s.metadata || s.metadata.purpose !== "renewal" || !s.metadata.event_id) return { ignored: "setup session for something else" };
  const customer = typeof s.customer === "string" ? s.customer : "", si = typeof s.setup_intent === "string" ? s.setup_intent : "";
  if (!customer || !si) return { ignored: "no saved card" };
  const r = await stripeCall(env, "GET", "/v1/setup_intents/" + encodeURIComponent(si));
  const pm = r.ok && r.data && (typeof r.data.payment_method === "string" ? r.data.payment_method : r.data.payment_method && r.data.payment_method.id);
  if (!pm) return err(502, "Could not read the saved card; will retry.");
  const res = await enrollRenewal(env, { installerId: s.metadata.event_id, userId: s.metadata.user_id, customer, paymentMethod: pm, plan: s.metadata.plan, sessionId: s.id, version: s.metadata.consent });
  return { renewal: res };
}
