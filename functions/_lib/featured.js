// Featured plans: price, level and how long they last. Prices are in cents.
export const PLANS = {
  pin: { label: "Featured pin (30 days)", cents: 500, level: 1, days: 30 },
  top: { label: "Top of the list (30 days)", cents: 1000, level: 2, days: 30 },
  season: { label: "Whole season (until the event ends)", cents: 1500, level: 2, days: 0 },
};

// What the browser may know about plans (served by /api/config). Prices exist only in PLANS above.
export const PUBLIC_PLANS = Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, { label: p.label, cents: p.cents, days: p.days, level: p.level }]));

const addDays = (ymd, n) => new Date(Date.parse(ymd + "T00:00:00Z") + n * 86400_000).toISOString().slice(0, 10);

// New featured/featured_until for an event after a paid plan. Extending a running placement adds time on top of it; the level never goes down.
export function applyPlan(ev, plan, today) {
  const p = PLANS[plan];
  const running = ev.featured && (!ev.featured_until || ev.featured_until >= today);
  const level = Math.max(p.level, running ? ev.featured : 0);
  let until;
  if (p.days) until = addDays(running && ev.featured_until && ev.featured_until > today ? ev.featured_until : today, p.days);
  else until = ev.end_date >= today ? ev.end_date : today;
  if (!p.days && running && ev.featured_until && ev.featured_until > until) until = ev.featured_until; // never shorten
  return { featured: level, featured_until: until };
}

// Verifies a Stripe webhook signature header ("t=...,v1=...") over the raw body with the endpoint's signing secret.
export async function verifyStripeSignature(raw, header, secret, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => { const i = kv.indexOf("="); return [kv.slice(0, i).trim(), kv.slice(i + 1)]; }));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((kv) => kv.trim().startsWith("v1=")).map((kv) => kv.trim().slice(3));
  if (!t || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  const eq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
  return sigs.some((s) => eq(s, hex));
}

// Switches off the placement an order applied (refund / lost dispute). Only touches the event if it still holds exactly what this
// order wrote, so a hand-comped or later-extended placement is never wiped. Always records the new order status.
export async function revokePlan(db, order, status) {
  let manual = false;
  if (order.applied && order.event_id && !order.event_id.startsWith("sub:")) {
    const r = await db.prepare("UPDATE events SET featured=0, featured_until=NULL, updated_at=datetime('now') WHERE id=? AND featured=? AND featured_until IS ?")
      .bind(order.event_id, order.applied_featured, order.applied_until ?? null).run();
    manual = !(r.meta && r.meta.changes);
  }
  await db.prepare("UPDATE feature_orders SET status=?, refunded_at=COALESCE(refunded_at, datetime('now')) WHERE session_id=?").bind(status, order.session_id).run();
  return manual;
}
