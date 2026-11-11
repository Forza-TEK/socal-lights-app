// Rate limits on the add forms (a home, an event). Every refusal says WHICH limit was hit and WHEN it resets, so a 429 is never a dead end.
//
// Two kinds of limit, on purpose:
//   - per ACCOUNT (the signed-in person): the real abuse limit. 5 a hour (homes, events). One person cannot post faster than before.
//   - per CONNECTION (the network address): a safety net for one address that makes many accounts. It used to be 5 an hour, which blocked every real person behind a
//     shared address (a library, city hall, a school or festival Wi-Fi, a mobile carrier) once five of them had posted. It is now 30 an hour; the account limit above
//     is what stops one person. A shared address is therefore blocked only when 30 submissions came through it in an hour.
// The answer carries `limit` ("account" | "connection" | "day"), `retry_after` (seconds) and `contact` so the page can offer the email address when someone really is blocked.
import { json } from "./util.js";

export const SUBMIT_LIMITS = { accountPerHour: 5, accountPerDay: { home: 5, event: 8 }, connectionPerHour: 30 };
export const CONTACT = "info@socallights.app";

// "about 12 minutes", "about 3 hours"
export function inWords(sec) {
  const m = Math.max(1, Math.ceil(sec / 60));
  if (m < 60) return `about ${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  return `about ${h} hour${h === 1 ? "" : "s"}`;
}

// How many seconds until the oldest of the counted rows leaves a window of `windowSec` seconds. `table`/`col`/`where` are fixed strings written in this file, never user input.
async function waitFor(env, table, where, binds, windowSec) {
  const row = await env.DB.prepare(`SELECT CAST(strftime('%s', MIN(created_at)) AS INTEGER) + ? - CAST(strftime('%s','now') AS INTEGER) AS wait FROM ${table} WHERE ${where}`).bind(windowSec, ...binds).first();
  return Math.max(60, (row && row.wait) || windowSec);
}
const count = async (env, sql, ...binds) => ((await env.DB.prepare(sql).bind(...binds).first()) || {}).n || 0;

// kind: "home" | "event". Returns null when the person may go ahead, otherwise { limit, status: 429, error, retry_after }.
export async function checkSubmitLimits(env, { ip, user, kind }) {
  const email = String(user.email || "").toLowerCase(), ev = kind === "event", word = ev ? "events" : "homes";
  const table = ev ? "event_submissions" : "posts";
  const who = ev ? "lower(contact_email) = ?" : "contest_id IS NULL AND (user_id = ? OR lower(contact_email) = ?)", whoBinds = ev ? [email] : [user.id, email];
  const mine = (win) => count(env, `SELECT COUNT(*) AS n FROM ${table} WHERE ${who} AND created_at > datetime('now','-${win}')`, ...whoBinds);
  // 1. this account, in the last 24 hours (the daily cap)
  const day = await mine("1 day");
  if (day >= SUBMIT_LIMITS.accountPerDay[kind]) {
    const wait = await waitFor(env, table, `${who} AND created_at > datetime('now','-1 day')`, whoBinds, 86400);
    return { limit: "day", status: 429, retry_after: wait, error: `You've added ${day} ${word} in the last 24 hours, which is the daily limit for one account (${SUBMIT_LIMITS.accountPerDay[kind]}). You can add another in ${inWords(wait)}. Your answers are saved here, or email ${CONTACT} if you need to add more today.` };
  }
  // 2. this account, in the last hour
  const hour = await mine("1 hour");
  if (hour >= SUBMIT_LIMITS.accountPerHour) {
    const wait = await waitFor(env, table, `${who} AND created_at > datetime('now','-1 hour')`, whoBinds, 3600);
    return { limit: "account", status: 429, retry_after: wait, error: `You've added ${hour} ${word} in the last hour, which is the limit for one account. You can add another in ${inWords(wait)}. Your answers are saved here, so nothing is lost.` };
  }
  // 3. this connection (network address), in the last hour. A shared network counts as one connection.
  const net = await count(env, "SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')", ip);
  if (net >= SUBMIT_LIMITS.connectionPerHour) {
    const wait = await waitFor(env, "submit_log", "ip = ? AND created_at > datetime('now','-1 hour')", [ip], 3600);
    return { limit: "connection", status: 429, retry_after: wait, error: `This network (shared Wi-Fi counts as one connection) has sent ${net} submissions in the last hour, which is its limit. It resets in ${inWords(wait)}. Your answers are saved here, so try again then, or email ${CONTACT} and we will add it for you.` };
  }
  return null;
}

export const limitResponse = (l) => json({ error: l.error, limit: l.limit, retry_after: l.retry_after, contact: CONTACT }, { status: 429, headers: { "retry-after": String(l.retry_after) } });
