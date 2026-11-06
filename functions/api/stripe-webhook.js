// POST /api/stripe-webhook — Stripe tells us about Featured payments; we switch the placement on, and off again on refund/dispute.
// Set up in Stripe: Developers > Webhooks > endpoint https://socallights.app/api/stripe-webhook, events checkout.session.completed,
// checkout.session.async_payment_succeeded, checkout.session.expired, charge.refunded, charge.dispute.created, charge.dispute.closed,
// then store its signing secret as STRIPE_WEBHOOK_SECRET.
//
// Retry safety: nothing is "done" until it has really been applied. The order row records `applied`; the Stripe event id is written to
// stripe_events only after the work succeeded; failures that a retry can fix return 500 so Stripe redelivers.
import { json, err } from "../_lib/util.js";
import { logOp } from "../_lib/oplog.js";
import { bump } from "../_lib/funnel.js";
import { sendFeaturePaidEmail } from "../_lib/featuremail.js";
import { sponsorWindow } from "../_lib/sponsor.js";
import { sponsorEmails } from "../_lib/sponsormail.js";
import { PLANS, INSTALLER_PLANS, ptToday, LEGACY_SEASON_CENTS, applyOrder, verifyStripeSignature, revokePlan, setOrderNote, AUTO } from "../_lib/featured.js";

const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired", "charge.refunded", "charge.dispute.created", "charge.dispute.closed"]);

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) return err(400, "Bad signature.");
  let evt; try { evt = JSON.parse(raw); } catch { return err(400, "Bad payload."); }
  if (!evt || !evt.id || !HANDLED.has(evt.type)) return json({ ok: true, ignored: evt && evt.type });

  if (await env.DB.prepare("SELECT 1 FROM stripe_events WHERE id = ?").bind(evt.id).first()) return json({ ok: true, duplicate: true });

  let res;
  try { res = await handle(evt, env); } catch (e) { console.error("stripe-webhook", evt.type, evt.id, e && e.message); await logOp(env, "webhook", `${evt.type} ${evt.id}: ${e && e.message}`); return err(500, "Could not process; please retry."); }
  if (res instanceof Response) { if (res.status >= 500) await logOp(env, "webhook", `${evt.type} ${evt.id}: answered ${res.status}, Stripe will retry`); return res; } // a retryable failure: leave the event unrecorded so Stripe redelivers
  await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id,type) VALUES (?,?)").bind(evt.id, evt.type).run();
  return json({ ok: true, ...res });
}

async function handle(evt, env) {
  const o = (evt.data && evt.data.object) || {};
  switch (evt.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": return paid(o, env);
    case "checkout.session.expired": return { expired: o.id || null }; // abandoned checkout: recorded in stripe_events only
    case "charge.refunded": {
      const order = await orderByPi(env, o.payment_intent);
      if (!order) return pendingRevocation(env, o.payment_intent, o.refunded === true ? "refunded" : "held");
      await env.DB.prepare("UPDATE feature_orders SET charge_id = ? WHERE session_id = ?").bind(o.id || null, order.session_id).run();
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
  const mt = s.metadata && s.metadata.target, target = mt === "home" ? "home" : mt === "installer" ? "installer" : "event"; // a home (podium finisher) and an installer's Sponsor placement are bought through the same orders
  const price = target === "installer" ? INSTALLER_PLANS[plan] : PLANS[plan];
  if (!eventId || !price) return { ignored: "no feature metadata" };
  if (target === "home" && !PLANS[plan].days) return { ignored: "no Full run plan for homes" };

  // One order per Checkout session. The row existing is NOT proof the placement was applied; `applied` is.
  const pi = (typeof s.payment_intent === "string" && s.payment_intent) || null;
  let status = "paid"; const notes = [];
  let expected = price.cents; // an installer's price is prorated by the days left in the season: the same server calculation the checkout used
  if (target === "installer") { const inst = await env.DB.prepare("SELECT banner_until, top_until FROM installers WHERE id = ?").bind(eventId).first(); if (inst) expected = sponsorWindow(plan, inst, ptToday()).cents; }
  const exists = await env.DB.prepare("SELECT 1 FROM feature_orders WHERE session_id = ?").bind(s.id).first();
  if (!exists && pi) { // did a refund or dispute for this payment already arrive?
    const pend = await env.DB.prepare("SELECT kind FROM feature_pending_revocations WHERE payment_intent = ?").bind(pi).first();
    if (pend) { status = pend.kind; notes.push(`${AUTO}${{ refunded: "a refund", held: "a partial refund", disputed: "a dispute", dispute_won: "a dispute (won)" }[pend.kind] || pend.kind} reached us before the payment was recorded, so the placement was not applied.`); }
  }
  if ((s.amount_total !== expected && !(target !== "installer" && plan === "season" && s.amount_total === LEGACY_SEASON_CENTS)) || String(s.currency || "").toLowerCase() !== "usd") // the buyer paid what we asked at checkout: still apply, but flag it
    notes.push(`${AUTO}amount mismatch: paid ${s.amount_total == null ? "?" : (s.amount_total / 100).toFixed(2)} ${String(s.currency || "?").toUpperCase()}, the ${plan} plan is ${(expected / 100).toFixed(2)} USD.`);
  await env.DB.prepare("INSERT OR IGNORE INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,user_id,note,target,refunded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CASE WHEN ? = 'paid' THEN NULL ELSE datetime('now') END)")
    .bind(s.id, eventId, plan, s.amount_total ?? null, (s.customer_details && s.customer_details.email) || "", pi, s.currency || null, status, (s.metadata && s.metadata.user_id) || null, notes.join(" ").slice(0, 500) || null, target, status).run();
  if (!exists && status !== "paid") await env.DB.prepare("DELETE FROM feature_pending_revocations WHERE payment_intent = ?").bind(pi).run();
  const order = await env.DB.prepare("SELECT * FROM feature_orders WHERE session_id = ?").bind(s.id).first();
  if (order.applied) return { duplicate: true };
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
  if (target === "installer") { await bump(env, "fn:sponsor-paid"); await sponsorEmails(env, order, nf, s); return { sponsor: nf }; } // counted and mailed once: a replay returns "duplicate" above
  if (target === "event") { const q = await env.DB.prepare("SELECT name FROM events WHERE id = ?").bind(targetId).first(); await sendFeaturePaidEmail(env, { order, name: q && q.name, until: nf.featured_until, eventId: targetId }); }
  return { featured: nf };
}
