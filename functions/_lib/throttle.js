// Caps and cooldowns on email we send on a visitor's behalf (quote requests, weekly-alert confirmations): N-03 and S-10 in the 2026-11-07 audit.
// Rows live in send_throttle under a one-way hash of the account, address or network address (never the raw value) and are deleted after two days,
// which is inside the "IP addresses within two days" promise in the privacy policy.
import { sha256 } from "./auth.js";

export async function hashKey(env, ...parts) {
  return (await sha256(`${(env && env.THROTTLE_SALT) || "scl-throttle"}|${parts.join("|")}`)).slice(0, 32);
}

// Checks every rule and, only when all pass, records one send under each key. Returns "" when allowed, otherwise the message to show (use it with a 429).
// rules: [{ kind, key, max, windowHours (or windowSeconds for a short window), cooldownSeconds?, msg, coolMsg? }]
export async function checkThrottle(env, rules) {
  for (const r of rules) {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n, COALESCE(MIN(CAST(strftime('%s','now') AS INTEGER) - CAST(strftime('%s', created_at) AS INTEGER)), 999999) AS newest
       FROM send_throttle WHERE kind = ? AND key = ? AND created_at > datetime('now', ?)`
    ).bind(r.kind, r.key, r.windowSeconds ? `-${r.windowSeconds} seconds` : `-${r.windowHours} hours`).first();
    if (r.cooldownSeconds && row.n > 0 && row.newest < r.cooldownSeconds) return r.coolMsg || "Please wait a minute and try again.";
    if (row.n >= r.max) return r.msg;
  }
  await env.DB.batch([
    ...rules.map((r) => env.DB.prepare("INSERT INTO send_throttle (kind, key) VALUES (?, ?)").bind(r.kind, r.key)),
    env.DB.prepare("DELETE FROM send_throttle WHERE created_at < datetime('now','-48 hours')"),
  ]);
  return "";
}

const ipOf = (request) => request.headers.get("CF-Connecting-IP") || "unknown";

// Quote-request emails (installer page and contest page): 5 a day and one a minute per account, 10 a day per connection (hashed).
// Returns "" (and records the send) or the message for a 429.
export async function quoteThrottle(env, request, user) {
  return checkThrottle(env, [
    { kind: "quote-user", key: await hashKey(env, "u", user.id), max: 5, windowHours: 24, cooldownSeconds: 60, msg: "You've sent several quote requests today. Please wait until tomorrow to send more.", coolMsg: "Please wait a minute before sending another quote request." },
    { kind: "quote-ip", key: await hashKey(env, "ip", ipOf(request)), max: 10, windowHours: 24, msg: "Too many quote requests from this connection today. Please try again tomorrow." },
  ]);
}

// Weekly-alert confirmation emails: 3 a day per address and 20 a day per connection (hashed). Only counts emails actually sent.
export async function alertConfirmThrottle(env, request, email) {
  return checkThrottle(env, [
    { kind: "alert-email", key: await hashKey(env, "e", String(email).toLowerCase()), max: 3, windowHours: 24, msg: "We've already sent a few confirmation emails to this address today. Please check your inbox and spam folder for the link, or try again tomorrow." },
    { kind: "alert-ip", key: await hashKey(env, "ip", ipOf(request)), max: 20, windowHours: 24, msg: "Too many requests from this connection today. Please try again tomorrow." },
  ]);
}

// Votes: at most 40 a minute per connection (hashed). A home, a school or an event Wi-Fi shares one address among many people, so the limit is generous:
// it stops a script, not a crowd. Returns "" (and records the vote) or the message for a 429; the voter just tries again in a moment.
export const VOTES_PER_MINUTE = 40;
export async function voteThrottle(env, request) {
  return checkThrottle(env, [
    { kind: "vote-ip", key: await hashKey(env, "ip", ipOf(request)), max: VOTES_PER_MINUTE, windowSeconds: 60, msg: "Slow down a little. Lots of votes are coming from your connection right now. Wait a minute and tap Vote again." },
  ]);
}
