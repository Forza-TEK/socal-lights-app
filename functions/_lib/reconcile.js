// Stripe vs our records, read-only. Lists the last 3 days of Checkout Sessions and PaymentIntents from Stripe (GET only) and compares them with feature_orders
// (event, home and installer orders are all in that table; an automatic renewal order is keyed by its PaymentIntent id). It reports:
//   - "unrecorded": a paid session of ours (it carries our metadata) with no order row: the webhook never got through
//   - "unapplied":  an order row that is paid but whose placement was never switched on (older than an hour)
//   - "amount":     Stripe's amount differs from the order's
//   - "unknown":    a paid session or payment that carries none of our metadata and matches no order (not made by our checkout)
// Free plan: a request may make 50 outgoing calls, so one run reads one page of each list (LIMIT objects each, about 20 in all) and keeps its cursor in
// job_heartbeats.state ('stripe-reconcile'); the daily workflow calls again until `done`. The finished pass is kept as `last` for the digest. Needs STRIPE_SECRET_KEY;
// a restricted key needs the read permissions listed in docs/stripe-setup.md, and without them the result is "not_permitted" (shown, never an error).
import { stripeCall } from "./stripe.js";
import { logOpOnce } from "./oplog.js";
import { recordHeartbeat } from "./heartbeat.js";

export const JOB = "stripe-reconcile";
export const LIMIT = 10, WINDOW_DAYS = 3, GRACE_MIN = 30, UNAPPLIED_MIN = 60, MAX_FINDINGS = 25;
const nowSql = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const ageMin = (sql, now) => Math.round((now - Date.parse(String(sql).replace(" ", "T") + "Z")) / 60000);
const usd = (c) => (c == null ? "?" : (c / 100).toFixed(2));

export async function readState(env) {
  try { const r = await env.DB.prepare("SELECT state FROM job_heartbeats WHERE job = ?").bind(JOB).first(); return r && r.state ? JSON.parse(r.state) : {}; } catch { return {}; }
}
async function writeState(env, st) {
  try { await env.DB.prepare("INSERT INTO job_heartbeats (job, state) VALUES (?, ?) ON CONFLICT(job) DO UPDATE SET state = excluded.state").bind(JOB, JSON.stringify(st).slice(0, 8000)).run(); } catch {}
}

// Pure: compare one page of Stripe objects with the order rows found for them. Returns findings [{ kind, id, pi, text }].
export function compare({ sessions = [], intents = [], orders = [] }, now = Date.now()) {
  const bySession = new Map(orders.map((o) => [o.session_id, o])), byPi = new Map(orders.filter((o) => o.payment_intent).map((o) => [o.payment_intent, o]));
  const out = [], seenPi = new Set();
  for (const s of sessions) {
    if (!s || s.mode === "setup" || s.status !== "complete" || s.payment_status !== "paid") continue; // abandoned, expired, saved-card only, or not paid
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : "";
    if (pi) seenPi.add(pi);
    const m = s.metadata || {}, ours = !!(m.event_id && m.plan), o = bySession.get(s.id) || (pi && byPi.get(pi));
    const old = ageMin(nowSql((s.created || 0) * 1000), now) >= GRACE_MIN;
    if (!o) { if (old) out.push(ours ? { kind: "unrecorded", id: s.id, pi, text: `Paid in Stripe but no order recorded: session ${s.id}, ${usd(s.amount_total)} ${String(s.currency || "").toUpperCase()}, plan ${m.plan}. The webhook did not get through: replay it from Stripe > Developers > Webhooks.` } : { kind: "unknown", id: s.id, pi, text: `A paid Stripe session with none of our details: ${s.id}, ${usd(s.amount_total)} ${String(s.currency || "").toUpperCase()}. Not made by our checkout?` }); continue; }
    if (o.status === "paid" && !o.applied && !String(o.event_id || "").startsWith("sub:") && ageMin(o.created_at, now) >= UNAPPLIED_MIN) out.push({ kind: "unapplied", id: s.id, pi, text: `Order ${s.id} is paid but the placement was never switched on (${usd(o.amount)} USD, ${o.plan}). Open Admin > Orders.` });
    if (o.amount != null && s.amount_total != null && o.amount !== s.amount_total) out.push({ kind: "amount", id: s.id, pi, text: `Order ${s.id}: Stripe says ${usd(s.amount_total)}, our record says ${usd(o.amount)}.` });
  }
  for (const p of intents) {
    if (!p || p.status !== "succeeded" || seenPi.has(p.id)) continue;
    const renewal = !!(p.metadata && p.metadata.renewal === "1"), o = bySession.get(p.id) || byPi.get(p.id);
    if (o || ageMin(nowSql((p.created || 0) * 1000), now) < (renewal ? GRACE_MIN : 24 * 60)) continue; // a checkout payment normally shows up through its session (the session list is checked first)
    out.push({ kind: renewal ? "unrecorded" : "unknown", id: p.id, pi: p.id, text: renewal ? `An automatic renewal charge ${p.id} (${usd(p.amount_received || p.amount)}) has no order recorded.` : `A successful payment ${p.id} (${usd(p.amount_received || p.amount)}) matches no order.` });
  }
  return out;
}

async function ordersFor(env, ids) {
  const list = [...new Set(ids.filter(Boolean))]; if (!list.length) return [];
  const q = list.map(() => "?").join(",");
  return (await env.DB.prepare(`SELECT session_id, payment_intent, status, applied, event_id, plan, amount, created_at FROM feature_orders WHERE session_id IN (${q}) OR payment_intent IN (${q})`).bind(...list, ...list).all()).results;
}

// One step of the pass: reads one page of sessions and one of payment intents (at most 2 Stripe calls), compares, saves the cursor. Returns a summary for the caller.
export async function reconcileStep(env, now = Date.now()) {
  const finish = async (st, last) => { await writeState(env, { ...st, pass: null, last }); await recordHeartbeat(env, JOB, last.status === "ok" || last.status === "not_configured" || last.status === "not_permitted" ? "ok" : "fail", last.status === "ok" ? `${last.checked} checked, ${last.findings.length} to look at` : last.status); return { done: true, ...last }; };
  const st = await readState(env);
  if (!env.STRIPE_SECRET_KEY) return finish(st, { at: nowSql(now), status: "not_configured", checked: 0, findings: [] });
  const pass = st.pass || { since: Math.floor(now / 1000) - WINDOW_DAYS * 86400, s: { cur: "", done: false }, p: { cur: "", done: false }, findings: [], checked: 0 };
  const sessions = [], intents = [];
  let stripeStatus = 200;
  const page = async (path, side, into) => {
    if (side.done) return;
    const r = await stripeCall(env, "GET", `${path}?limit=${LIMIT}&created[gte]=${pass.since}${side.cur ? "&starting_after=" + encodeURIComponent(side.cur) : ""}`);
    if (!r.ok) { stripeStatus = r.status || 599; return; }
    const rows = Array.isArray(r.data.data) ? r.data.data : [];
    into.push(...rows); pass.checked += rows.length;
    if (r.data.has_more && rows.length) side.cur = rows[rows.length - 1].id; else side.done = true;
  };
  await page("/v1/checkout/sessions", pass.s, sessions);
  if (stripeStatus === 200) await page("/v1/payment_intents", pass.p, intents);
  if (stripeStatus === 401 || stripeStatus === 403) return finish(st, { at: nowSql(now), status: "not_permitted", checked: 0, findings: [] });
  if (stripeStatus !== 200) { await writeState(env, { ...st, pass }); await recordHeartbeat(env, JOB, "fail", `Stripe answered ${stripeStatus}`); return { done: false, error: `Stripe answered ${stripeStatus}`, checked: pass.checked }; }
  let orders = []; try { orders = await ordersFor(env, [...sessions.map((s) => s.id), ...sessions.map((s) => s.payment_intent).filter((x) => typeof x === "string"), ...intents.map((p) => p.id)]); } catch { /* unreadable: report nothing rather than everything */ return { done: false, error: "orders unreadable", checked: pass.checked }; }
  for (const f of compare({ sessions, intents, orders }, now)) if (pass.findings.length < MAX_FINDINGS && !pass.findings.some((x) => x.id === f.id && x.kind === f.kind)) pass.findings.push(f);
  if (!(pass.s.done && pass.p.done)) { await writeState(env, { ...st, pass }); return { done: false, checked: pass.checked, found: pass.findings.length }; }
  // Pass complete: a payment intent already explained by a session finding is not listed twice
  const sessPi = new Set(pass.findings.filter((f) => f.pi && (f.kind === "unrecorded" || f.kind === "unknown") && f.id.startsWith("cs_")).map((f) => f.pi));
  const findings = pass.findings.filter((f) => !(f.id.startsWith("pi_") && sessPi.has(f.id)));
  for (const f of findings) await logOpOnce(env, "reconcile", `Stripe vs orders (${f.kind}): ${f.text}`.slice(0, 280), 20 * 60);
  return finish(st, { at: nowSql(now), status: "ok", checked: pass.checked, findings });
}

// For the digest: the last finished pass as lines, or [] when there is nothing to say.
export function reconcileLines(st) {
  const l = st && st.last; if (!l) return [];
  if (l.status === "not_permitted") return [`Stripe check could not read Checkout Sessions or PaymentIntents: the STRIPE_SECRET_KEY lacks read permission (docs/stripe-setup.md, "Stripe reconcile").`];
  if (l.status === "not_configured") return ["Stripe check skipped: STRIPE_SECRET_KEY is not set."];
  return l.findings.map((f) => f.text);
}
