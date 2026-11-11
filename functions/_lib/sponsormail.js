// The two emails sent when an installer's Sponsor placement is applied: a receipt-style confirmation to the buyer and a note to the team. Best effort:
// a failed email never fails the webhook (the placement is already on). Both are service emails (no unsubscribe, no marketing). Stripe also sends its own receipt.
import { sendTemplate } from "./mailtpl.js";
import { INSTALLER_PLANS } from "./featured.js";
import { money } from "./money.js";
import { logOp } from "./oplog.js";
import { receiptExtras } from "./ordermail.js";

const cancelLink = async (env, installerId) => { const r = await env.DB.prepare("SELECT cancel_token FROM installer_autorenew WHERE installer_id = ?").bind(installerId).first().catch(() => null); return r && r.cancel_token ? `https://socallights.app/cancel-renewal?t=${r.cancel_token}` : "https://socallights.app/pricing"; };
const nice = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const usd = money;

export async function sponsorEmails(env, order, nf, session, renewal = false) {
  try {
    const inst = await env.DB.prepare("SELECT name, slug FROM installers WHERE id = ?").bind(order.event_id).first();
    if (!inst) return;
    const buyer = (order.user_id && (await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(order.user_id).first().catch(() => null))?.email) || order.email || (session && session.customer_details && session.customer_details.email) || "";
    const vars = { installer: inst.name, plan: INSTALLER_PLANS[order.plan].label, price: usd(order.amount ?? INSTALLER_PLANS[order.plan].cents), from: nice(nf.from), to: nice(nf.to), buyer, link: `https://socallights.app/installer/${inst.slug}/manage`, ...receiptExtras(order, "installer") };
    if (buyer) await sendTemplate(env, renewal ? "renewal_charged" : "sponsor_paid", buyer, renewal ? { ...vars, cancel_link: await cancelLink(env, order.event_id) } : vars).catch(() => {});
    if (env.ADMIN_NOTIFY_EMAIL) await sendTemplate(env, "sponsor_admin", env.ADMIN_NOTIFY_EMAIL, vars).catch(() => {});
    else await logOp(env, "email", "sponsor_admin: ADMIN_NOTIFY_EMAIL is not set, so the admin was not told about this Sponsor payment");
  } catch (e) { console.error("sponsor emails", e && e.message); }
}
