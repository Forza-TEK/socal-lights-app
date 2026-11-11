// "We got it" / "You're live" emails after someone adds a home, an event or a contest (templates home_received, home_live, event_received, event_live,
// contest_received, contest_live_now in mailtpl.js). They are service emails to the signed-in person who just submitted, sent through the same pipeline as every other
// template (sendTemplate: Resend, the admin-editable wording, the plain footer).
//
// Rules, in order:
//   1. The address must look like an address.
//   2. The shared do-not-contact list is respected: an address that unsubscribed (email_prefs), asked to be removed, left the monthly update or sits on outreach_suppressions gets no receipt.
//      If the lookup itself fails, nothing is sent (fail closed) and the failure goes to ops_log.
//   3. The existing send throttle applies (send_throttle, hashed): 20 receipts a day per address, so a loop of submissions cannot turn into a mail flood.
// It never throws and never blocks the submission. Returns what happened, so the page and the tests can tell:
//   "queued" (handed to the mail service, or on its way through waitUntil) | "invalid" | "suppressed" | "held" (suppression lookup failed) | "throttled"
import { sendTemplate } from "./mailtpl.js";
import { checkEmails } from "./outreach.js";
import { checkThrottle, hashKey } from "./throttle.js";
import { logOp } from "./oplog.js";

export const RECEIPT_MAX_PER_DAY = 20;

export async function sendReceipt(env, waitUntil, { id, to, vars }) {
  try {
    const addr = String(to || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return "invalid";
    try {
      const { results } = await checkEmails(env, [addr]);
      if (results[0] && results[0].status === "suppressed") return "suppressed";
    } catch (e) { await logOp(env, "email", `${id}: receipt not sent, the suppression check failed (${e && e.message})`); return "held"; }
    const blocked = await checkThrottle(env, [{ kind: "receipt", key: await hashKey(env, "receipt", addr), max: RECEIPT_MAX_PER_DAY, windowHours: 24, msg: "receipt limit" }]);
    if (blocked) return "throttled";
    const job = sendTemplate(env, id, addr, vars).catch((e) => logOp(env, "email", `${id}: receipt could not be prepared (${e && e.message})`));
    if (waitUntil) waitUntil(job); else await job;
    return "queued";
  } catch (e) { await logOp(env, "email", `${id}: receipt failed (${e && e.message})`); return "held"; }
}
