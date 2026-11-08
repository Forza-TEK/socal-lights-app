// Optional automatic renewal of an installer's Sponsor placement (installers only, default OFF).
//
// THE FLOW
//   Opt in: an unticked-by-default box on /sponsor before paying (Checkout then saves the card with Stripe, setup_future_usage=off_session), or a button in the installer
//   dashboard (a small Stripe setup Checkout). Both send the exact wording the buyer saw (CONSENT_TEXTS) and its version. Only Stripe ids are stored, never a card number.
//   Reminder: 7 days before each charge, once per renewal, with the amount, date, plan, a note if the price changed, and a one-click cancel link (no login).
//   Charge: on the last day of the running placement (Pacific date), at the plan's CURRENT price (INSTALLER_PLANS), as an off-session PaymentIntent with an idempotency key per
//   installer + season. The paid order goes through the SAME apply machinery as a Checkout payment (stripe-webhook.js applyPaid): the order's session_id is the PaymentIntent id, so the
//   webhook (payment_intent.succeeded) and this job can both deliver it and it is recorded once. The placement starts the day after the running one ends (sponsor.js), at most one season ahead.
//   Failure: email a link to pay once or update the card, retry ONCE 3 days later, then the renewal lapses and no more automatic charges are made.
//   Cancel: any time before the charge, from the dashboard or the link in any email. Cancelling keeps the placement already paid for.
//   Refund or dispute of an automatic charge pauses the renewal and tells the team.
import { INSTALLER_PLANS, ptToday, addDays } from "./featured.js";
import { sponsorWindow, sponsorProblem, planEnds } from "./sponsor.js";
import { stripeCall, sha256hex } from "./stripe.js";
import { sendTemplate } from "./mailtpl.js";
import { bump } from "./funnel.js";
import { logOp } from "./oplog.js";

export const REMINDER_DAYS = 7, RETRY_DAYS = 3, MAX_ATTEMPTS = 2;
export const CONSENT_VERSION = "2026-11-07";
// What the buyer agrees to, word for word. A new wording gets a new version; old versions stay so we can show what someone agreed to.
export const CONSENT_TEXTS = {
  "2026-11-07": "Renew automatically each season: we charge your saved card on the last day of your placement at the plan price shown then (currently {price}), and the next season starts the next day. We email you 7 days before each charge. Cancel any time in your dashboard or from the link in any email.",
};
export const usd = (c) => "$" + (c % 100 ? (c / 100).toFixed(2) : c / 100);
export const consentText = (cents, version = CONSENT_VERSION) => (CONSENT_TEXTS[version] || CONSENT_TEXTS[CONSENT_VERSION]).replace("{price}", usd(cents));
const nice = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const newToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, "0")).join("");
export const validToken = (t) => /^[a-f0-9]{36}$/.test(String(t || ""));
const SITE = "https://socallights.app";
const shortErr = (e) => String(e || "").replace(/[^\w .,:'-]/g, "").slice(0, 120); // a decline code or message; never anything that looks like card data

export const renewalByToken = (env, t) => (validToken(t) ? env.DB.prepare("SELECT * FROM installer_autorenew WHERE cancel_token = ?").bind(t).first() : null);
export const renewalFor = (env, installerId) => env.DB.prepare("SELECT * FROM installer_autorenew WHERE installer_id = ?").bind(installerId).first();

// The plan that renews and the date it ends, from what is running now: Banner and top of the list when both run, else whichever one runs (a top-of-the-list-only placement renews as top-only).
export function renewingPlan(inst, today) {
  const b = !!inst.banner_until && inst.banner_until >= today, t = !!inst.top_until && inst.top_until >= today;
  if (b && t) return { plan: "banner_top", ends: planEnds("banner_top", inst, today) };
  if (t) return { plan: "top", ends: inst.top_until };
  if (b) return { plan: "banner", ends: inst.banner_until };
  return null;
}

async function mail(env, id, to, vars) { try { return await sendTemplate(env, id, to, vars); } catch { return false; } }
const adminTo = (env) => env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com";
async function ownerEmail(env, row) {
  const u = row.user_id ? await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(row.user_id).first().catch(() => null) : null;
  if (u && u.email) return u.email;
  const i = await env.DB.prepare("SELECT owner_email FROM installers WHERE id = ?").bind(row.installer_id).first().catch(() => null);
  return (i && i.owner_email) || "";
}
function vars(inst, row, extra = {}) {
  const p = INSTALLER_PLANS[row.plan] || INSTALLER_PLANS.banner;
  return { installer: inst.name, plan: p.label, price: usd(p.cents), cancel_link: `${SITE}/cancel-renewal?t=${row.cancel_token}`, link: `${SITE}/sponsor?installer=${encodeURIComponent(inst.slug)}&plan=${row.plan}`, dashboard: `${SITE}/installer/${inst.slug}/manage`, consent: consentText(p.cents, row.consent_text_version || CONSENT_VERSION), ...extra };
}

// Turns automatic renewal on (or updates the saved card). Idempotent per Checkout session: a replayed webhook changes nothing and sends nothing more.
// Returns "enrolled" | "same" | "nothing-to-renew".
export async function enrollRenewal(env, { installerId, userId, customer, paymentMethod, plan, sessionId, paidCents, version }) {
  const today = ptToday(), inst = await env.DB.prepare("SELECT id, slug, name, banner_until, top_until FROM installers WHERE id = ?").bind(installerId).first();
  if (!inst) return "nothing-to-renew";
  const running = renewingPlan(inst, today);
  if (!running) return "nothing-to-renew";
  const use = plan && INSTALLER_PLANS[plan] ? plan : running.plan, ends = planEnds(use, inst, today) || running.ends;
  const r = await env.DB.prepare(`INSERT INTO installer_autorenew (installer_id, user_id, stripe_customer_id, stripe_payment_method_id, plan, enabled, status, consent_text_version, consent_at, consent_session_id, next_charge_date, notice_sent_for, retry_at, attempts, last_error, last_paid_cents, cancel_token, cancelled_at, consent_text)
      VALUES (?1, ?2, ?3, ?4, ?5, 1, 'active', ?6, datetime('now'), ?7, ?8, NULL, NULL, 0, NULL, ?9, ?10, NULL, ?11)
      ON CONFLICT(installer_id) DO UPDATE SET user_id = excluded.user_id, stripe_customer_id = excluded.stripe_customer_id, stripe_payment_method_id = excluded.stripe_payment_method_id, plan = excluded.plan, enabled = 1, status = 'active',
        consent_text_version = excluded.consent_text_version, consent_text = excluded.consent_text, consent_at = datetime('now'), consent_session_id = excluded.consent_session_id, next_charge_date = excluded.next_charge_date, notice_sent_for = NULL, retry_at = NULL, attempts = 0, last_error = NULL,
        last_paid_cents = COALESCE(excluded.last_paid_cents, installer_autorenew.last_paid_cents), cancelled_at = NULL, updated_at = datetime('now')
      WHERE installer_autorenew.consent_session_id IS NOT excluded.consent_session_id`)
    .bind(installerId, userId || null, customer || null, paymentMethod || null, use, version || CONSENT_VERSION, sessionId || null, ends, paidCents ?? null, newToken(), consentText(INSTALLER_PLANS[use].cents, version || CONSENT_VERSION)).run();
  if (!(r.meta && r.meta.changes)) return "same";
  const row = await renewalFor(env, installerId);
  await bump(env, "fn:autorenew-opt-in");
  const to = await ownerEmail(env, row);
  if (to) await mail(env, "renewal_enrolled", to, vars(inst, row, { date: nice(ends) }));
  return "enrolled";
}

// Cancels (from the dashboard or an email link). The placement already paid for stays. Returns true when it was active.
export async function cancelRenewal(env, row, by = "owner") {
  if (!row || row.status === "cancelled") return false;
  await env.DB.prepare("UPDATE installer_autorenew SET enabled = 0, status = 'cancelled', cancelled_at = datetime('now'), retry_at = NULL, updated_at = datetime('now') WHERE installer_id = ?").bind(row.installer_id).run();
  if (row.stripe_payment_method_id && env.STRIPE_SECRET_KEY) { // the saved card is removed at Stripe too; turning renewal on again asks for the card again
    await stripeCall(env, "POST", `/v1/payment_methods/${encodeURIComponent(row.stripe_payment_method_id)}/detach`, new URLSearchParams()).catch(() => null);
    await env.DB.prepare("UPDATE installer_autorenew SET stripe_payment_method_id = NULL WHERE installer_id = ?").bind(row.installer_id).run();
  }
  await bump(env, "fn:autorenew-cancelled");
  const inst = await env.DB.prepare("SELECT name, slug FROM installers WHERE id = ?").bind(row.installer_id).first(), to = await ownerEmail(env, row);
  if (inst && to) await mail(env, "renewal_cancelled", to, vars(inst, row, { by }));
  return true;
}

// A refund or dispute of an installer order pauses the renewal (if it was running) and tells the team.
export async function pauseOnRevoke(env, order, why) {
  if (!order || order.target !== "installer") return false;
  const r = await env.DB.prepare("UPDATE installer_autorenew SET enabled = 0, status = 'paused', retry_at = NULL, updated_at = datetime('now') WHERE installer_id = ?1 AND status = 'active' AND (?2 = 1 OR consent_session_id = ?3)")
    .bind(order.event_id, order.renewal ? 1 : 0, order.session_id).run();
  if (!(r.meta && r.meta.changes)) return false;
  const inst = await env.DB.prepare("SELECT name FROM installers WHERE id = ?").bind(order.event_id).first();
  await mail(env, "renewal_admin", adminTo(env), { installer: (inst && inst.name) || order.event_id, what: `Automatic renewal was paused because a charge was ${why}. No more automatic charges will be made until the installer turns it on again.`, plan: order.plan, price: usd(order.amount || 0) });
  return true;
}

// ---- the daily job ----
// Returns counts for the workflow log. `deps.apply(piLikeSession)` records and applies a paid renewal (stripe-webhook.js applyPaid); passed in so this file does not import the route.
export async function processRenewals(env, deps, today = ptToday()) {
  const out = { reminded: 0, charged: 0, failed: 0, retried: 0, lapsed: 0, skipped: 0 };
  const rows = (await env.DB.prepare("SELECT * FROM installer_autorenew WHERE enabled = 1 AND status = 'active' AND next_charge_date IS NOT NULL ORDER BY next_charge_date LIMIT 200").all()).results;
  for (const row of rows) {
    const inst = await env.DB.prepare("SELECT id, slug, name, web, phone, area, status, owner_email, banner_until, top_until FROM installers WHERE id = ?").bind(row.installer_id).first();
    if (!inst || !inst.owner_email) { await env.DB.prepare("UPDATE installer_autorenew SET enabled = 0, status = 'cancelled', cancelled_at = datetime('now') WHERE installer_id = ?").bind(row.installer_id).run(); out.skipped++; continue; }
    const plan = INSTALLER_PLANS[row.plan] ? row.plan : "banner", p = INSTALLER_PLANS[plan];
    // 1. the reminder, once per renewal. Fail closed: no reminder on record for this charge date means no charge (a failed email send is retried on the next run).
    let noticed = row.notice_sent_for === row.next_charge_date;
    if (row.notice_sent_for !== row.next_charge_date && addDays(row.next_charge_date, -REMINDER_DAYS) <= today && row.next_charge_date >= today) {
      const w = sponsorWindow(plan, { ...inst, banner_until: inst.banner_until, top_until: inst.top_until }, today), to = await ownerEmail(env, row);
      const note = row.last_paid_cents != null && row.last_paid_cents !== p.cents ? `The price changed: you last paid ${usd(row.last_paid_cents)} and this renewal is ${usd(p.cents)}. ` : "";
      const sent = to ? await mail(env, "renewal_reminder", to, vars(inst, { ...row, plan }, { date: nice(row.next_charge_date), from: nice(w.from), to: nice(w.to), note })) : false;
      if (sent) { await env.DB.prepare("UPDATE installer_autorenew SET notice_sent_for = ?, updated_at = datetime('now') WHERE installer_id = ?").bind(row.next_charge_date, row.installer_id).run(); out.reminded++; noticed = true; }
    }
    // 2. the charge: on the charge date (or a missed day later), or the single retry
    const dueFirst = row.attempts === 0 && row.next_charge_date <= today, dueRetry = row.attempts === 1 && row.retry_at && row.retry_at <= today;
    if (!dueFirst && !dueRetry) continue;
    if (!noticed) { out.skipped++; await logOp(env, "renewal", `${inst.name}: charge held because the reminder email could not be sent; it will be tried again on the next run`); continue; }
    // the person who agreed must still own the profile (ownership changed, account deleted): never charge for someone else
    const who = row.user_id ? await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(row.user_id).first().catch(() => null) : null;
    if (!who || who.email !== inst.owner_email) { await env.DB.prepare("UPDATE installer_autorenew SET enabled = 0, status = 'paused', updated_at = datetime('now') WHERE installer_id = ?").bind(row.installer_id).run(); await mail(env, "renewal_admin", adminTo(env), { installer: inst.name, what: "Automatic renewal was paused because the profile's owner changed or the account is gone. Nothing was charged.", plan: row.plan, price: usd(p.cents) }); out.skipped++; continue; }
    const w = sponsorWindow(plan, inst, today), why = sponsorProblem(inst, plan, today);
    if (w.full) { // already booked as far ahead as we sell (the owner renewed by hand): move the date, no charge
      await env.DB.prepare("UPDATE installer_autorenew SET next_charge_date = ?, notice_sent_for = NULL, updated_at = datetime('now') WHERE installer_id = ?").bind(w.booked_to, row.installer_id).run(); out.skipped++; continue;
    }
    if (why) { await failCharge(env, inst, { ...row, plan }, why, out, true); continue; } // profile no longer sellable (hidden, contact removed): treated as a failure the owner can fix
    const to = await ownerEmail(env, row);
    const f = new URLSearchParams({ amount: String(w.cents), currency: "usd", customer: row.stripe_customer_id || "", payment_method: row.stripe_payment_method_id || "", off_session: "true", confirm: "true",
      "payment_method_types[0]": "card",
      description: `SoCal Lights Sponsor renewal: ${inst.name} (${plan})`.slice(0, 200),
      "metadata[event_id]": inst.id, "metadata[target]": "installer", "metadata[plan]": plan, "metadata[user_id]": row.user_id || "", "metadata[renewal]": "1", "metadata[renewal_from]": w.from, "metadata[quote_from]": w.from, "metadata[quote_to]": w.to, "metadata[quote_cents]": String(w.cents) });
    if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) f.set("receipt_email", to);
    const idem = "renew-" + (await sha256hex(`${inst.id}|${plan}|${w.from}|${row.attempts}`)); // one charge per installer + season (+ the single retry)
    // Claim this attempt in the database BEFORE asking Stripe, in the same statement that checks renewal is still on (a cancel is honored up to this moment). A claimed attempt whose
    // outcome is unknown (a timeout, a crash) is repeated with the same Stripe idempotency key, which returns the original result instead of charging again.
    await env.DB.prepare("INSERT OR IGNORE INTO installer_renewal_attempts (installer_id, season_from, attempt, status) SELECT ?1, ?2, ?3, 'pending' WHERE EXISTS (SELECT 1 FROM installer_autorenew WHERE installer_id = ?1 AND enabled = 1 AND status = 'active')").bind(inst.id, w.from, row.attempts).run();
    const claimed = await env.DB.prepare("SELECT status FROM installer_renewal_attempts WHERE installer_id = ? AND season_from = ? AND attempt = ?").bind(inst.id, w.from, row.attempts).first();
    if (!claimed || claimed.status === "done") { out.skipped++; continue; } // cancelled just now, or already answered
    const res = await stripeCall(env, "POST", "/v1/payment_intents", f, idem);
    if (res.status === 0 || res.status >= 500) { await logOp(env, "renewal", `${inst.name}: Stripe did not answer the renewal charge (${res.status || "no answer"}); the attempt stays pending and is repeated safely on the next run`); out.skipped++; continue; } // not a decline: no failure is counted
    const pi = res.data || {};
    await env.DB.prepare("UPDATE installer_renewal_attempts SET status = 'done', payment_intent = ? WHERE installer_id = ? AND season_from = ? AND attempt = ?").bind(pi.id || null, inst.id, w.from, row.attempts).run();
    if (res.ok && pi.status === "succeeded") {
      const applied = await deps.apply({ id: pi.id, payment_status: "paid", amount_total: pi.amount_received || pi.amount, currency: pi.currency, payment_intent: pi.id, customer_details: { email: pi.receipt_email || to }, metadata: { ...(pi.metadata || {}), renewal: "1", event_id: inst.id, target: "installer", plan, user_id: row.user_id || "" } }, env);
      if (applied instanceof Response && applied.status >= 500) { out.failed++; continue; } // recorded when Stripe redelivers payment_intent.succeeded, and the next run does not charge again (same idempotency key)
      const after = await env.DB.prepare("SELECT banner_until, top_until FROM installers WHERE id = ?").bind(inst.id).first();
      const next = planEnds(plan, after, today) || w.to;
      await env.DB.prepare("UPDATE installer_autorenew SET attempts = 0, retry_at = NULL, last_error = NULL, notice_sent_for = NULL, next_charge_date = ?, last_paid_cents = ?, updated_at = datetime('now') WHERE installer_id = ?").bind(next, pi.amount_received || pi.amount, inst.id).run();
      await bump(env, "fn:autorenew-charged"); out.charged++; if (dueRetry) out.retried++;
    } else {
      const code = (pi.error && (pi.error.decline_code || pi.error.code || pi.error.message)) || (pi.last_payment_error && (pi.last_payment_error.decline_code || pi.last_payment_error.code)) || (pi.status ? "status " + pi.status : res.status ? "http " + res.status : "no answer from Stripe");
      await failCharge(env, inst, { ...row, plan }, code, out, false);
    }
  }
  await bump(env, "fn:autorenew-run"); // heartbeat: the digest shows when the job last ran
  return out;
}

async function failCharge(env, inst, row, error, out, noRetry) {
  const attempts = (row.attempts || 0) + 1, to = await ownerEmail(env, row), err = shortErr(error);
  await bump(env, "fn:autorenew-failed"); out.failed++;
  if (attempts >= MAX_ATTEMPTS || noRetry) {
    await env.DB.prepare("UPDATE installer_autorenew SET attempts = ?, enabled = 0, status = 'lapsed', retry_at = NULL, last_error = ?, updated_at = datetime('now') WHERE installer_id = ?").bind(attempts, err, row.installer_id).run();
    out.lapsed++;
    if (to) await mail(env, "renewal_lapsed", to, vars(inst, row, { date: nice(row.next_charge_date) }));
    await mail(env, "renewal_admin", adminTo(env), { installer: inst.name, what: `Automatic renewal lapsed after a failed charge (${err}). No more automatic charges will be made.`, plan: row.plan, price: usd((INSTALLER_PLANS[row.plan] || INSTALLER_PLANS.banner).cents) });
  } else {
    const retry = addDays(ptToday(), RETRY_DAYS);
    await env.DB.prepare("UPDATE installer_autorenew SET attempts = ?, retry_at = ?, last_error = ?, updated_at = datetime('now') WHERE installer_id = ?").bind(attempts, retry, err, row.installer_id).run();
    if (to) await mail(env, "renewal_failed", to, vars(inst, row, { date: nice(row.next_charge_date), retry: nice(retry) }));
  }
}

// Deletes the renewal rows tied to an account and detaches their saved payment methods at Stripe (best effort). Used by account deletion.
export async function purgeRenewals(env, userId, email) {
  const rows = (await env.DB.prepare("SELECT installer_id, stripe_payment_method_id AS pm FROM installer_autorenew WHERE user_id = ?1 OR installer_id IN (SELECT id FROM installers WHERE lower(owner_email) = lower(?2))").bind(userId, email).all().catch(() => ({ results: [] }))).results;
  for (const r of rows) if (r.pm && env.STRIPE_SECRET_KEY) await stripeCall(env, "POST", `/v1/payment_methods/${encodeURIComponent(r.pm)}/detach`, new URLSearchParams()).catch(() => null);
  if (rows.length) await env.DB.prepare("DELETE FROM installer_autorenew WHERE user_id = ?1 OR installer_id IN (SELECT id FROM installers WHERE lower(owner_email) = lower(?2))").bind(userId, email).run();
  return rows.length;
}
