// The monthly update: a SEPARATE opt-in. Having an account or a listing never subscribes anyone; the controls are unchecked by default.
// This file only stores the permission (who, role, topics, when, how, which wording). The monthly email itself is a later task and must not be sent to anyone without an
// active row here (unsubscribed_at IS NULL). Unsubscribing also adds the address to the shared do-not-contact list (one-way hash, source "app").
import { suppressFromApp } from "./outreach.js";
import { unsubHeaders } from "./mailtpl.js";

// Bump when the wording below changes; every row records the version the person saw.
export const CONSENT_VERSION = "2026-11-07";
export const CONSENT_TEXT = "Email me a monthly update with seasonal recommendations. I can unsubscribe at any time.";
// Stored for the future newsletter (shown with the controls and on the preferences page): sponsored and affiliate content will always be labeled.
export const DISCLOSURE = "Sponsored or affiliate content in the update will be clearly identified.";
export const ROLES = {
  installer: { label: "Installer", topics: [["seasonal_reminders", "Seasonal reminders"], ["product_updates", "Product updates"], ["shop_suggestions", "Shop and supply suggestions"]] },
  host: { label: "Event or contest host", topics: [["planning_tips", "Planning tips"], ["opportunities", "Upcoming opportunities"]] },
  family: { label: "Family", topics: [["outings", "Outings"], ["shopping_ideas", "Seasonal shopping ideas"]] },
};
export const METHODS = ["profile checkbox", "add-listing checkbox", "prefs page"];
export const SOURCE_PAGES = ["profile", "add-house", "add-event", "add-contest", "prefs"];

const newToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, "0")).join("");
const cleanEmail = (e) => String(e || "").trim().toLowerCase();
export const validToken = (t) => /^[a-f0-9]{36}$/.test(String(t || ""));

// What the pages need to draw the controls (no personal data).
export const config = () => ({ version: CONSENT_VERSION, text: CONSENT_TEXT, disclosure: DISCLOSURE, roles: Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label, topics: r.topics.map(([tid, label]) => ({ id: tid, label })) })) });

// Keeps only the topic ids that exist for the role (no duplicates). An empty list is fine: the person picked a role and no specific topic.
export function cleanTopics(role, topics) {
  const ok = new Set((ROLES[role] ? ROLES[role].topics : []).map((t) => t[0]));
  return [...new Set((Array.isArray(topics) ? topics : []).filter((t) => typeof t === "string" && ok.has(t)))];
}
const shape = (r) => (r ? { role: r.role, topics: JSON.parse(r.topics || "[]"), active: !r.unsubscribed_at, opted_in_at: r.opted_in_at, method: r.method, source_page: r.source_page, unsubscribed_at: r.unsubscribed_at || null } : null);

export async function optinFor(env, email) {
  const r = await env.DB.prepare("SELECT * FROM newsletter_optins WHERE email = ?").bind(cleanEmail(email)).first();
  return shape(r);
}
export async function optinByToken(env, token) {
  if (!validToken(token)) return null;
  const r = await env.DB.prepare("SELECT * FROM newsletter_optins WHERE token = ?").bind(token).first();
  return r ? { email: r.email, ...shape(r) } : null;
}

// The person opts in (or changes role and topics). Returns { ok: true, optin } or { ok: false, error }.
// A person who is already subscribed keeps their original opt-in time and method when they only change role or topics; a person who had unsubscribed gets a new time, method and wording version.
export async function saveOptin(env, { user, role, topics, method, source_page }) {
  if (!ROLES[role]) return { ok: false, error: "Choose whether you are an installer, an event or contest host, or a family." };
  if (!METHODS.includes(method) || !SOURCE_PAGES.includes(source_page)) return { ok: false, error: "That couldn't be saved." };
  const email = cleanEmail(user.email), list = JSON.stringify(cleanTopics(role, topics));
  const cur = await env.DB.prepare("SELECT unsubscribed_at FROM newsletter_optins WHERE email = ?").bind(email).first();
  if (!cur) {
    await env.DB.prepare("INSERT INTO newsletter_optins (user_id, email, role, topics, opted_in_at, method, source_page, consent_text_version, token) VALUES (?,?,?,?,datetime('now'),?,?,?,?)")
      .bind(user.id, email, role, list, method, source_page, CONSENT_VERSION, newToken()).run();
  } else if (cur.unsubscribed_at) {
    await env.DB.prepare("UPDATE newsletter_optins SET user_id = ?, role = ?, topics = ?, opted_in_at = datetime('now'), method = ?, source_page = ?, consent_text_version = ?, unsubscribed_at = NULL, updated_at = datetime('now') WHERE email = ?")
      .bind(user.id, role, list, method, source_page, CONSENT_VERSION, email).run();
  } else {
    await env.DB.prepare("UPDATE newsletter_optins SET role = ?, topics = ?, user_id = ?, updated_at = datetime('now') WHERE email = ?").bind(role, list, user.id, email).run();
  }
  return { ok: true, optin: await optinFor(env, email) };
}

// Preferences page: change role and topics without logging in (the token is the proof). Only for someone who is subscribed.
export async function savePrefs(env, token, role, topics) {
  const o = await optinByToken(env, token);
  if (!o) return { ok: false, status: 404, error: "This link isn't valid. If you copied it, check that the whole link was pasted." };
  if (!o.active) return { ok: false, status: 409, error: "You are unsubscribed. To get the monthly update again, turn it on in your profile." };
  if (!ROLES[role]) return { ok: false, status: 400, error: "Choose whether you are an installer, an event or contest host, or a family." };
  await env.DB.prepare("UPDATE newsletter_optins SET role = ?, topics = ?, updated_at = datetime('now') WHERE token = ?").bind(role, JSON.stringify(cleanTopics(role, topics)), token).run();
  return { ok: true, optin: await optinByToken(env, token) };
}

// Unsubscribe by the link's token, or by email (the profile switch). Also puts the address on the shared do-not-contact list. Idempotent.
export async function unsubscribe(env, { token, email }) {
  const row = token
    ? (validToken(token) ? await env.DB.prepare("SELECT email FROM newsletter_optins WHERE token = ?").bind(token).first() : null)
    : await env.DB.prepare("SELECT email FROM newsletter_optins WHERE email = ?").bind(cleanEmail(email)).first();
  if (!row) return false;
  await env.DB.prepare("UPDATE newsletter_optins SET unsubscribed_at = COALESCE(unsubscribed_at, datetime('now')), updated_at = datetime('now') WHERE email = ?").bind(row.email).run();
  await suppressFromApp(env, row.email);
  return true;
}

// For the future monthly email (not sent yet): the person's own preferences page and the headers that give mail apps a one-click unsubscribe (RFC 8058) to the same /api/prefs machinery.
export async function newsletterLinks(env, email, site = "https://socallights.app") {
  const r = await env.DB.prepare("SELECT token FROM newsletter_optins WHERE email = ? AND unsubscribed_at IS NULL").bind(cleanEmail(email)).first();
  return r ? { prefsUrl: `${site}/prefs?t=${r.token}`, headers: unsubHeaders(`${site}/api/prefs?t=${r.token}`) } : null; // null: no active opt-in, so do not send
}
