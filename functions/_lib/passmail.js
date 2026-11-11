// The receipt / "what you bought" email for a contest pass, from the editable template `contest_pass_paid` (Admin > Settings > Email templates), and the Admin notice for a
// "more than 20 contests" lead. Best effort: a failed email never blocks the payment or the pass.
import { sendTemplate } from "./mailtpl.js";
import { money } from "./money.js";
import { receiptExtras } from "./ordermail.js";
import { CONTEST_PASSES, LEGACY_PASSES, orgLabel } from "./passes.js";
import { CONTEST_CONTENTS, FAIR, niceDate, capLine } from "../../public/contest-passes.js"; // the pass contents are written once, for the pages and this email

const SITE = "https://socallights.app";

// order: the feature_orders row. nf: { org_key, cap, from, to } from applyPassOrder. cents: what was paid.
export async function sendPassPaidEmail(env, order, nf, cents) {
  const to = order && order.email;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const p = CONTEST_PASSES[order.plan] || LEGACY_PASSES[order.plan];
  if (!p) return false;
  const list = ["- " + capLine(p.cap), ...CONTEST_CONTENTS.map((b) => "- " + b), "- " + FAIR].join("\n");
  try {
    return await sendTemplate(env, "contest_pass_paid", to, {
      org: orgLabel(nf.org_key), pass: p.label, amount: money(cents), start: niceDate(nf.from), end: niceDate(nf.to), list, link: `${SITE}/add-contest`, ...receiptExtras(order, "pass"),
    });
  } catch (e) { console.error("pass email", e && e.message); return false; }
}
