// AI assistant actions: the allowlist, the fields each card asks for, validation, and what happens when the visitor taps the button.
// Principles (docs/ai-assistant-actions-design.md): the model never runs an action. Our code decides which cards may appear, the visitor fills in and
// confirms each one, and POST /api/chat/act does the work through the same logic the site's own forms use (same limits, same logs).
// Counters only: chat_actions holds one number per day per action name, never any text.
import { json, err, clean } from "./util.js";
import { normEmailText, normText } from "./fields.js";
import { looksEmail } from "../../public/norm.js";
import { CITY } from "../../public/cities.js";
import { ipPruneStatements } from "./retention.js";
import { newId } from "./util.js";
import { sendAskHuman } from "./chatmail.js";
import { utcDay } from "./chatsettings.js";
import { onRequestPost as alertsPost } from "../api/alerts/index.js";
import { onRequestPost as removeHomePost } from "../api/remove-home.js";

// Field specs are what the widget renders. Every limit here is enforced again by the server in run().
const F = {
  message: { name: "message", label: "Your message", type: "textarea", required: true, max: 600 },
  contact: { name: "contact", label: "Your email (optional, so we can reply)", type: "email", required: false, max: 120 },
  where: { name: "where", label: "Which event or home?", type: "text", required: true, max: 120 },
  what: { name: "message", label: "What is wrong?", type: "textarea", required: true, max: 600 },
  email: { name: "email", label: "Your email", type: "email", required: true, max: 120 },
  city: { name: "city", label: "City", type: "text", required: true, max: 60, list: "cities" },
  radius: { name: "radius", label: "How far from the city", type: "select", required: true, options: [["5", "5 miles"], ["10", "10 miles"], ["25", "25 miles"]], value: "10" },
  consent: { name: "consent", label: "I want this free weekly email. I can stop it any time.", type: "checkbox", required: true },
  address: { name: "address", label: "Street address of the home", type: "text", required: true, max: 200 },
  note: { name: "note", label: "Anything else we should know (optional)", type: "textarea", required: false, max: 600 },
};

export const ACTIONS = {
  ask_human: { tier: 1, label: "Send this to the team", summary: "Your message goes to the SoCal Lights team by email. Only what is in this box is sent.", fields: [F.message, F.contact], done: "Sent. Thank you, the team will read it. If you gave an email, we will reply there." },
  report_problem: { tier: 1, label: "Report a problem", summary: "Tell the team what is wrong with a listing. Only what is in these boxes is sent.", fields: [F.where, F.what, F.contact], done: "Thank you, the team has your report." },
  weekly_email: { tier: 1, label: "Sign me up", summary: "One short free email a week with lights and events near a city. We email you a link to confirm first, and nothing is sent until you tap it.", fields: [F.email, F.city, F.radius, F.consent], done: "Almost done: check your email and tap the confirmation link." },
  remove_home: { tier: 1, label: "Send removal request", summary: "Asks the team to take a home off the map. You do not need an account. We email you when it is done.", fields: [F.address, F.email, F.note], done: "Request sent. We will email you when it is done." },
};
export const ACTION_IDS = Object.keys(ACTIONS);
export const cityNames = () => Object.keys(CITY).sort();

// Validates the visitor's field values against the spec. Returns { ok, values } or { ok: false, error }.
export function validate(id, input) {
  const a = ACTIONS[id]; if (!a) return { ok: false, error: "That action is not available." };
  const src = input && typeof input === "object" ? input : {}, values = {};
  for (const f of a.fields) {
    let v = src[f.name];
    if (f.type === "checkbox") { v = v === true || v === "true" || v === "on"; if (f.required && !v) return { ok: false, error: "Please tick the box to continue." }; values[f.name] = v; continue; }
    v = typeof v === "string" ? v : v == null ? "" : String(v);
    v = f.type === "email" ? normEmailText(clean(v, f.max)).toLowerCase() : f.type === "textarea" ? normText(clean(v, f.max)) : clean(v, f.max);
    if (f.required && !v) return { ok: false, error: `Please fill in: ${f.label}` };
    if (f.type === "email" && v && !looksEmail(v)) return { ok: false, error: "That email address does not look right." };
    if (f.type === "select" && !f.options.some(([o]) => o === v)) v = f.value;
    values[f.name] = v;
  }
  if ((id === "ask_human" || id === "report_problem") && String(values.message).length < 5) return { ok: false, error: "A few words is enough, but please write something." };
  if (id === "weekly_email" && !CITY[values.city]) return { ok: false, error: "Choose a city from the list." };
  if (id === "remove_home" && String(values.address).length < 5) return { ok: false, error: "Tell us the street address of the home." };
  return { ok: true, values };
}

export async function bumpAction(env, action, col, day = utcDay()) {
  if (!["shown", "done", "failed"].includes(col)) return;
  try { await env.DB.prepare(`INSERT INTO chat_actions (day, action, ${col}) VALUES (?, ?, 1) ON CONFLICT(day, action) DO UPDATE SET ${col} = ${col} + 1`).bind(day, String(action).slice(0, 40)).run(); await env.DB.prepare("DELETE FROM chat_actions WHERE day < date(?, '-120 days')").bind(day).run(); } catch {}
}

// The chat session has already passed the "I am human" check (the signed scl_chat cookie), so the form logic that would ask for a fresh check is told it is satisfied.
const checked = (env) => ({ ...env, TURNSTILE_SECRET: "", TURNSTILE_REQUIRED: "0" });
const post = (request, path, body, ip) => new Request(new URL(path, request.url).href, { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, origin: new URL(request.url).origin }, body: JSON.stringify(body) });
const asResult = async (res) => { const d = await res.json().catch(() => ({})); return res.ok && d.ok !== false ? { ok: true } : { ok: false, error: d.error || "That did not go through. Please try again, or email info@socallights.app.", status: res.status }; };

// Runs a validated action. Returns { ok, error? }. `ctx` carries { page, summary } for the Ask Human email.
export async function runAction(env, request, id, values, ctx = {}) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (id === "ask_human" || id === "report_problem") {
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
    if (n >= 5) return { ok: false, error: "Thanks, we have your messages. Please try again in an hour.", status: 429 };
    const name = id === "ask_human" ? "Ask Human (AI assistant)" : "Problem report (AI assistant)";
    const message = id === "report_problem" ? `Listing: ${values.where}\n${values.message}` : values.message;
    await env.DB.batch([
      env.DB.prepare("INSERT INTO reports (id, ref, name, message, contact) VALUES (?,?,?,?,?)").bind(newId(), id === "ask_human" ? "chat" : "chat-report", name, message, values.contact || ""),
      env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
      ...ipPruneStatements(env),
    ]);
    const topic = id === "report_problem" ? "Problem report: " + values.where : String(values.message).slice(0, 60);
    const ok = await sendAskHuman(env, { topic, message, contact: values.contact || "", page: ctx.page || "", summary: ctx.summary || "" });
    return { ok: true, emailed: ok };
  }
  if (id === "weekly_email") return asResult(await alertsPost({ request: post(request, "/api/alerts", { email: values.email, city: values.city, radius: Number(values.radius), consent: true, src: "chat" }, ip), env: checked(env) }));
  if (id === "remove_home") return asResult(await removeHomePost({ request: post(request, "/api/remove-home", { address: values.address, email: values.email, note: values.note || "" }, ip), env: checked(env) }));
  return { ok: false, error: "That action is not available." };
}
