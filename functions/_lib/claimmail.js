// The "your claim was approved / declined" email, from the editable templates `claim_approved` and `claim_declined` (Admin > Settings > Email templates).
// Best effort: a failed email is logged (ops_log) and never blocks the admin's decision. No tokens in links: the link is /feature with the public event id.
import { sendTemplate } from "./mailtpl.js";
import { logOp } from "./oplog.js";

const SITE = "https://socallights.app";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns true when the mail service accepted it. name: the event's name.
export async function sendClaimDecisionEmail(env, { approved, email, eventId, name }) {
  if (!email || !EMAIL.test(email)) return false;
  const id = approved ? "claim_approved" : "claim_declined";
  try {
    const ok = await sendTemplate(env, id, email, {
      name: name || "your event",
      link: `${SITE}/feature?event=${encodeURIComponent(eventId || "")}`,
    });
    if (!ok) await logOp(env, "email", `${id}: not sent`);
    return !!ok;
  } catch (e) { await logOp(env, "email", `${id}: ${e && e.message}`); return false; }
}
