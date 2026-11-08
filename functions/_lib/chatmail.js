// Emails the AI assistant sends to the site owner. These bypass the editable email templates on purpose: the subject prefix and the
// X-SCL-Category header must never change, because the owner sorts these emails with Outlook rules (docs/ai-assistant-actions-design.md).
//   Ask Human : subject starts "[SCL Ask Human]", header X-SCL-Category: ask-human, first body line "SoCal Lights - Ask Human"
//   Cap alert : subject starts "[SCL AI Cap]",    header X-SCL-Category: ai-cap
import { sendMail } from "./auth.js";
import { usageState, utcDay } from "./chatsettings.js";

export const ASK_HUMAN_PREFIX = "[SCL Ask Human]";
export const CAP_PREFIX = "[SCL AI Cap]";
export const ASK_HUMAN_HEADER = { "X-SCL-Category": "ask-human" };
export const CAP_HEADER = { "X-SCL-Category": "ai-cap" };
const adminTo = (env) => env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com";
const oneLine = (s, n) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

// topic: a short summary line for the subject. message: what the visitor chose to send. contact: the visitor's email if they gave one (becomes Reply-To).
export async function sendAskHuman(env, { topic, message, contact = "", page = "", summary = "" }) {
  const subject = `${ASK_HUMAN_PREFIX} ${oneLine(topic, 70) || "A visitor needs help"}`;
  const text = [
    "SoCal Lights - Ask Human",
    "",
    "A visitor asked the AI assistant to send this to the team.",
    "",
    "Their message:",
    String(message ?? "").slice(0, 1200),
    "",
    `Contact: ${contact || "none given (they cannot be replied to)"}`,
    `Page: ${oneLine(page, 200) || "unknown"}`,
    summary ? `\nWhat the assistant had already told them:\n${String(summary).slice(0, 800)}` : "",
    "",
    "This was sent because the visitor tapped Send to the team. Nothing else from their chat was saved or sent.",
  ].filter((l) => l !== undefined).join("\n");
  return sendMail(env, { to: adminTo(env), subject, text, headers: ASK_HUMAN_HEADER, tag: "chat_ask_human", ...(contact ? { replyTo: contact } : {}) });
}

// Emails the owner at 80% and again at 100% of the monthly cap, once per month for each. Never throws.
export async function checkCapAlerts(env, settings, state = null, day = utcDay()) {
  try {
    const cap = settings.capUsd;
    if (!(cap > 0)) return [];
    const st = state || (await usageState(env, day));
    const month = day.slice(0, 7), sent = [];
    for (const pct of [80, 100]) {
      if (st.monthUsd < (cap * pct) / 100) continue;
      const r = await env.DB.prepare("INSERT OR IGNORE INTO chat_settings (key, value, updated_by) VALUES (?, '1', 'cap alert')").bind(`cap_alert_${month}_${pct}`).run();
      if (!r || !r.meta || !r.meta.changes) continue; // already sent this month
      const money = (n) => "$" + n.toFixed(2);
      const subject = `${CAP_PREFIX} AI assistant is at ${pct}% of its monthly cap`;
      const text = [
        "SoCal Lights - AI cap",
        "",
        pct >= 100
          ? `The AI assistant has used its whole monthly cap (${money(cap)}). It has stopped answering with the model until next month, or until you raise the cap. Visitors still see the Send to the team button.`
          : `The AI assistant has used ${money(st.monthUsd)} of its ${money(cap)} monthly cap (${pct}%).`,
        "",
        `Counted cost this month: ${money(st.monthUsd)} (estimated from tokens; the Cloudflare and Anthropic dashboards are the source of truth)`,
        `Chats this month: ${st.monthChats}`,
        "",
        "Change the cap: Admin > AI assistant > Monthly cap (the highest the page allows is $10).",
        "https://socallights.app/admin/",
      ].join("\n");
      const ok = await sendMail(env, { to: adminTo(env), subject, text, headers: CAP_HEADER, tag: "chat_cap_alert" });
      sent.push({ pct, ok });
    }
    return sent;
  } catch { return []; }
}
