// Orders recorded by this site, added up for the last N days, by product (Admin > Orders and the dashboard). Stripe stays the source of truth for money:
// this only adds up the rows in feature_orders (every paid thing is one row there: Featured events and homes, installer plans, contest passes, Event Partner plans).
//   gross    : every order created in the window (whatever its status now), in US dollars
//   refunded : orders whose status is "refunded" (the money went back)
//   atRisk   : orders in "refund_due", "disputed" or "held" (money that may still go back: the owner has to act on these under Orders)
//   net      : gross minus refunded (at-risk money is still counted until it is actually refunded)
export const PRODUCTS = { event: "Featured events", home: "Featured homes", installer: "Installer plans", contest_pass: "Contest passes", event_partner: "Event Partner plans" };
const AT_RISK = new Set(["refund_due", "disputed", "held"]);

export const sqlAgo = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

// rows: [{ target, status, amount (cents), currency }] -> { rows: [{ key, label, orders, gross, refunded, atRisk, net }], total, otherCurrency }
export function sumOrders(rows) {
  const by = new Map(Object.keys(PRODUCTS).map((k) => [k, { key: k, label: PRODUCTS[k], orders: 0, gross: 0, refunded: 0, atRisk: 0, net: 0 }]));
  let otherCurrency = 0;
  for (const r of rows) {
    if (r.currency && String(r.currency).toLowerCase() !== "usd") { otherCurrency++; continue; }
    const k = by.has(r.target) ? r.target : "event", g = by.get(k), c = Number(r.amount) || 0;
    g.orders++; g.gross += c; if (r.status === "refunded") g.refunded += c; if (AT_RISK.has(r.status)) g.atRisk += c;
  }
  const list = [...by.values()].map((g) => ({ ...g, net: g.gross - g.refunded })).filter((g) => g.orders);
  const total = list.reduce((t, g) => ({ orders: t.orders + g.orders, gross: t.gross + g.gross, refunded: t.refunded + g.refunded, atRisk: t.atRisk + g.atRisk, net: t.net + g.net }), { orders: 0, gross: 0, refunded: 0, atRisk: 0, net: 0 });
  return { rows: list, total, otherCurrency };
}

export async function revenue(env, days = 30, now = Date.now()) {
  const since = sqlAgo(now - days * 86400000);
  let rows = [], error = "";
  try { rows = (await env.DB.prepare("SELECT target, status, amount, currency FROM feature_orders WHERE created_at >= ?").bind(since).all()).results; } catch (e) { error = String((e && e.message) || e).slice(0, 120); }
  return { days, since, ...sumOrders(rows), ...(error ? { error } : {}) };
}
