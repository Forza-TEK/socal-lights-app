// "We got it" / "You're live" emails after someone adds a home, an event or a contest (templates home_received, home_live, event_received, event_live,
// contest_received, contest_live_now in mailtpl.js). They are SERVICE mail: a reply to something the signed-in person just did, sent through the same pipeline as every other
// template (sendTemplate: Resend, the admin-editable wording, the plain footer). Owner decision 2026-11-11: someone who unsubscribed from marketing or the monthly update still gets
// their receipt, so the marketing opt-out (email_prefs), removal requests, the monthly-update unsubscribe and the outreach "do not contact" entries made for those reasons are NOT checked.
//
// Rules, in order:
//   1. The address must look like an address.
//   2. Skipped only for an address that cannot or must not be mailed: a hard bounce or a spam complaint (outreach_suppressions with reason bounce or complaint, outreach_events
//      bounce or complaint, outreach_invalid), or a deleted account (outreach_suppressions with source account_deleted). If that lookup fails, nothing is sent (fail closed) and
//      the failure goes to ops_log.
//   3. The existing send throttle applies (send_throttle, hashed): 20 receipts a day per address, so a loop of submissions cannot turn into a mail flood.
// It never throws and never blocks the submission. Returns what happened, so the page and the tests can tell:
//   "queued" (handed to the mail service, or on its way through waitUntil) | "invalid" | "undeliverable" (bounce, complaint, invalid or deleted account) | "held" (lookup failed) | "throttled"
import { sendTemplate } from "./mailtpl.js";
import { outreachHashes } from "./outreach.js";
import { checkThrottle, hashKey } from "./throttle.js";
import { logOp } from "./oplog.js";

export const RECEIPT_MAX_PER_DAY = 20;

async function undeliverable(env, addr) {
  const { h, n } = await outreachHashes(env, addr), hs = [...new Set([h, n])], q = hs.map(() => "?").join(",");
  const res = await env.DB.batch([
    env.DB.prepare(`SELECT 1 AS x FROM outreach_suppressions WHERE email_hash IN (${q}) AND (reason IN ('bounce','complaint') OR source = 'account_deleted') LIMIT 1`).bind(...hs),
    env.DB.prepare(`SELECT 1 AS x FROM outreach_events WHERE (email_hash IN (${q}) OR alias_hash IN (${q})) AND event IN ('bounce','complaint') LIMIT 1`).bind(...hs, ...hs),
    env.DB.prepare(`SELECT 1 AS x FROM outreach_invalid WHERE email_hash IN (${q}) LIMIT 1`).bind(...hs),
  ]);
  return res.some((r) => r && r.results && r.results.length);
}

export async function sendReceipt(env, waitUntil, { id, to, vars }) {
  try {
    const addr = String(to || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return "invalid";
    try { if (await undeliverable(env, addr)) return "undeliverable"; }
    catch (e) { await logOp(env, "email", `${id}: receipt not sent, the bounce check failed (${e && e.message})`); return "held"; }
    const blocked = await checkThrottle(env, [{ kind: "receipt", key: await hashKey(env, "receipt", addr), max: RECEIPT_MAX_PER_DAY, windowHours: 24, msg: "receipt limit" }]);
    if (blocked) return "throttled";
    const job = sendTemplate(env, id, addr, vars).catch((e) => logOp(env, "email", `${id}: receipt could not be prepared (${e && e.message})`));
    if (waitUntil) waitUntil(job); else await job;
    return "queued";
  } catch (e) { await logOp(env, "email", `${id}: receipt failed (${e && e.message})`); return "held"; }
}
