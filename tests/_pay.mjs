// Shared helpers for the payment tests: signed Stripe payloads, seeded events/users/sessions, a fetch stub that never reaches Stripe.
import { createHmac } from "node:crypto";
import { makeDB } from "./_d1.mjs";
import { sha256 } from "../functions/_lib/auth.js";

export const SECRET = "whsec_test_secret_value";
export const ptToday = (offsetDays = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(Date.now() + offsetDays * 86400_000));

export function newEnv(extra = {}) {
  const { DB, raw } = makeDB();
  return { env: { DB, STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_SECRET_KEY: "sk_test_fake", ...extra }, raw };
}

// Signs exactly like Stripe: t=<unix>,v1=HMAC_SHA256(secret, t + "." + body)
export function sign(body, { t = Math.floor(Date.now() / 1000), secret = SECRET } = {}) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}
let seq = 0;
export const stripeEvent = (type, object, id) => ({ id: id || "evt_" + type.replace(/\W/g, "") + "_" + ++seq, type, data: { object } });
export function webhookRequest(evt, opts = {}) {
  const body = typeof evt === "string" ? evt : JSON.stringify(evt);
  const headers = { "content-type": "application/json" };
  if (opts.header !== null) headers["stripe-signature"] = opts.header || sign(body, opts);
  return new Request("https://socallights.app/api/stripe-webhook", { method: "POST", headers, body });
}
export async function sendWebhook(handler, env, evt, opts) {
  const res = await handler({ request: webhookRequest(evt, opts), env });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export const session = (o = {}) => ({ id: "cs_test_1", payment_status: "paid", amount_total: 1500, currency: "usd", payment_intent: "pi_1", customer_details: { email: "buyer@example.com" }, metadata: { event_id: "ev1", plan: "top", user_id: "u1" }, ...o });

export function addEvent(raw, id = "ev1", o = {}) {
  const e = { name: "Light Show", county: "Los Angeles", city: "Pasadena", type: "walk", start_date: ptToday(-10), end_date: ptToday(60), lat: 34, lng: -118, url: "https://lightshow.example.org/tickets", featured: 0, featured_until: null, notice: "", ...o };
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,lat,lng,url,featured,featured_until,notice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, e.name, e.county, e.city, e.type, e.start_date, e.end_date, e.lat, e.lng, e.url, e.featured, e.featured_until, e.notice);
}
export const getEvent = (raw, id = "ev1") => ({ ...raw.prepare("SELECT * FROM events WHERE id = ?").get(id) });
export const getOrder = (raw, sid = "cs_test_1") => { const r = raw.prepare("SELECT * FROM feature_orders WHERE session_id = ?").get(sid); return r ? { ...r } : null; };

export async function addUser(raw, id, email) {
  raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)").run(id, email, "");
  const token = "tok_" + id;
  raw.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").run(await sha256(token), id, new Date(Date.now() + 86400_000).toISOString().slice(0, 19).replace("T", " "));
  return { id, email, cookie: "scl_session=" + token };
}

// Replaces fetch for one test; every call is recorded and answered with a fake Checkout session. Returns { calls, restore }.
export function stubFetch(reply) {
  const real = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return reply ? reply(url, init) : new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_fake" }), { status: 200, headers: { "content-type": "application/json" } }); };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

// Freezes Date.now() for one test.
export function freezeNow(iso) { const real = Date.now; Date.now = () => Date.parse(iso); return () => { Date.now = real; }; }
