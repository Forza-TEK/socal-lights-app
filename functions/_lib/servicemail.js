// Service mail (a receipt, "your payment was not applied", "your refund was issued") must reach people who unsubscribed from marketing or the monthly update:
// it is about money they paid. It still must NOT go to an address that hard-bounced or complained, or to a deleted account (all three are on the shared do-not-contact list).
import { outreachHashes } from "./outreach.js";

// false when the address is on the do-not-contact list because of a bounce, a complaint or an account deletion. An unsubscribe or a reply does not block service mail.
export async function canMailService(env, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  try {
    const { h, n } = await outreachHashes(env, e);
    const r = await env.DB.prepare("SELECT 1 AS x FROM outreach_suppressions WHERE email_hash IN (?, ?) AND (reason IN ('bounce','complaint') OR source = 'account_deleted') LIMIT 1").bind(h, n).first();
    return !r;
  } catch { return true; } // the list is not there (an old database): mail still goes out
}
