// Shared by the payment endpoints: the idempotency hash, the per-account cap on payment pages, and the Checkout Session request.
export const sha256hex = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

// Cap how many payment pages one account can open (card testing, plan rotation): 6 an hour, 20 a day. Counted only after every other check passed.
// Returns an error message, or "" when allowed (and the open is recorded). If the log cannot be read or written the buyer is never blocked.
export async function checkoutLimit(env, userId) {
  try {
    const n = await env.DB.prepare("SELECT SUM(created_at > datetime('now','-1 hour')) AS h, COUNT(*) AS d FROM checkout_log WHERE user_id = ? AND created_at > datetime('now','-1 day')").bind(userId).first();
    if ((n.h || 0) >= 6) return "You've opened a lot of payment pages in the last hour. Please wait a little while, or email info@socallights.app if something is wrong.";
    if ((n.d || 0) >= 20) return "You've opened a lot of payment pages today. Please try again tomorrow, or email info@socallights.app if something is wrong.";
    await env.DB.batch([env.DB.prepare("DELETE FROM checkout_log WHERE created_at < datetime('now','-3 days')"), env.DB.prepare("INSERT INTO checkout_log (user_id) VALUES (?)").bind(userId)]);
  } catch (e) { console.error("checkout_log", e && e.message); }
  return "";
}

// Opens a Stripe Checkout Session. Returns the payment page URL, or "" when Stripe could not be reached or refused.
export async function createCheckoutSession(env, form, idem) {
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "idempotency-key": idem, "content-type": "application/x-www-form-urlencoded" }, body: form }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  return r && r.ok && d.url ? d.url : "";
}
