import { REFUND, refundTermsUrl } from "../../public/refund-terms.js";
// Shared by the payment endpoints: the idempotency hash, the per-account cap on payment pages, and the Checkout Session request.
export const sha256hex = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

// Cap how many payment pages one account can open (card testing, plan rotation): 6 an hour, 20 a day. Counted only after every other check passed.
// Returns an error message, or "" when allowed (and the open is recorded). If the log cannot be read or written the buyer is never blocked.
// meta (optional, F-16): { ref, idem } is stored with the row so a second payment page for the same thing can be noticed (see otherOpenCheckout). Without the columns (before migration 0291) the plain row is written.
export async function checkoutLimit(env, userId, meta) {
  try {
    const n = await env.DB.prepare("SELECT SUM(created_at > datetime('now','-1 hour')) AS h, COUNT(*) AS d FROM checkout_log WHERE user_id = ? AND created_at > datetime('now','-1 day')").bind(userId).first();
    if ((n.h || 0) >= 6) return "You've opened a lot of payment pages in the last hour. Please wait a little while, or email info@socallights.app if something is wrong.";
    if ((n.d || 0) >= 20) return "You've opened a lot of payment pages today. Please try again tomorrow, or email info@socallights.app if something is wrong.";
    const del = env.DB.prepare("DELETE FROM checkout_log WHERE created_at < datetime('now','-3 days')");
    try { await env.DB.batch([del, meta && meta.ref ? env.DB.prepare("INSERT INTO checkout_log (user_id, ref, idem) VALUES (?,?,?)").bind(userId, meta.ref, meta.idem || null) : env.DB.prepare("INSERT INTO checkout_log (user_id) VALUES (?)").bind(userId)]); }
    catch (e) { if (!(meta && meta.ref)) throw e; await env.DB.prepare("INSERT INTO checkout_log (user_id) VALUES (?)").bind(userId).run(); } // columns not there yet
  } catch (e) { console.error("checkout_log", e && e.message); }
  return "";
}

// F-16: true when this account opened a payment page for the same thing (ref) in the last 23 hours with a DIFFERENT idempotency key, i.e. a second Checkout page that could be paid as well
// (Stripe keeps a page open for 24 hours). The same key hands back the same page, which is not a second page. Never blocks: any error answers false.
export async function otherOpenCheckout(env, userId, ref, idem) {
  try {
    const r = await env.DB.prepare("SELECT 1 AS x FROM checkout_log WHERE user_id = ? AND ref = ? AND created_at > datetime('now','-23 hours') AND COALESCE(idem,'') != ? LIMIT 1").bind(userId, ref, idem || "").first();
    return !!r;
  } catch { return false; }
}

// Opens a Stripe Checkout Session. Returns the payment page URL, or "" when Stripe could not be reached or refused.
// Audit M5: the refund rule is shown on the payment page itself (the same sentence as Pricing and the receipt, public/refund-terms.js), so a buyer and a dispute both see it at the moment of payment.
export const refundNote = (kind) => `${REFUND[kind] || REFUND.event} Full terms: ${refundTermsUrl(kind)}`.slice(0, 1000);
export async function createCheckoutSession(env, form, idem) {
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "idempotency-key": idem, "content-type": "application/x-www-form-urlencoded" }, body: form }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  return r && r.ok && d.url ? d.url : "";
}

// Plain Stripe API calls for renewals. Return { ok, status, data }; a network failure is { ok: false, status: 0, data: {} }. Card details never pass through here: only ids.
export async function stripeCall(env, method, path, form, idem) {
  const headers = { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  if (form) headers["content-type"] = "application/x-www-form-urlencoded";
  if (idem) headers["idempotency-key"] = idem;
  const r = await fetch("https://api.stripe.com" + path, { method, headers, ...(form ? { body: form } : {}) }).catch(() => null);
  const data = r ? await r.json().catch(() => ({})) : {};
  return { ok: !!r && r.ok, status: r ? r.status : 0, data };
}
