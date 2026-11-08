// POST /api/chat — the AI assistant. OFF until Admin > AI assistant switches it on (setting chat_enabled); a kill switch stops it at once. See docs/ai-assistant.md.
// Body: { messages: [{role, content}, ...] (the last 6 turns, ending with the visitor's), token: Turnstile token (needed for the first message of a visit only) }.
// Answer: { reply, ... }. Order of checks: switch, same origin, body size and shape, "I am human" check (once per visit, then a signed 30-minute cookie that carries no identity),
// limits per connection and overall, scope rules (no model call for off-topic, injection, personal data, contest rules), the cost cap, the model, the output filter.
// Nothing is logged but anonymous daily counters: no message text and no IP address (the limits use one-way scrambled codes kept two days, as for the other forms).
import { json, err, verifyTurnstile } from "../_lib/util.js";
import { sameOriginStrict, readCookie } from "../_lib/auth.js";
import { checkThrottle, hashKey } from "../_lib/throttle.js";
import { readSettings, isLive, usageState, capReason, recordUsage, recordGap, neuronsFor, claudeMicroUsd, providerOf } from "../_lib/chatsettings.js";
import { parseMessages, classify, filterOutput, MESSAGES } from "../_lib/chatguard.js";
import { buildContext, topicOf } from "../_lib/chatkb.js";
import { runModel } from "../_lib/chatmodel.js";

const COOKIE = "scl_chat", TTL = 1800;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sign(env, msg) {
  const secret = env.CHAT_SESSION_SECRET || env.THROTTLE_SALT || env.TURNSTILE_SECRET || "scl-chat";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("chat|" + msg))).slice(0, 40);
}
const mint = async (env) => { const exp = Math.floor(Date.now() / 1000) + TTL; return `${exp}.${await sign(env, String(exp))}`; };
async function validSession(env, request) {
  const v = readCookie(request, COOKIE), [exp, sig] = v.split(".");
  if (!exp || !sig || !/^\d{9,12}$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return (await sign(env, exp)) === sig;
}
const cookieHeader = (request, value) => `${COOKIE}=${value}; Path=/api/chat; HttpOnly; SameSite=Lax; Max-Age=${TTL}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
const NO_STORE = { "cache-control": "no-store" };
const say = (reply, extra = {}, headers = {}) => json({ reply, ...extra }, { headers: { ...NO_STORE, ...headers } });

export async function onRequestPost({ request, env }) {
  const settings = await readSettings(env);
  if (!isLive(settings, env)) return json({ error: "The AI assistant is not available right now.", off: true }, { status: 404, headers: NO_STORE });
  if (!sameOriginStrict(request)) return err(403, "Not allowed.");
  const raw = await request.text().catch(() => "");
  if (raw.length > 12000) return err(413, "That message is too long.");
  let body; try { body = JSON.parse(raw); } catch { return err(400, "Please send a question."); }
  const messages = parseMessages(body && body.messages);
  if (!messages) return err(400, "Please send a question (up to 500 characters).");
  const last = messages[messages.length - 1].content, first = messages.length === 1;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  let setCookie = "";
  if (!(await validSession(env, request))) {
    if (!(await verifyTurnstile(env, body.token, ip))) return json({ error: "Please complete the \"I am human\" check, then ask again.", needCheck: true }, { status: 403, headers: NO_STORE });
    setCookie = cookieHeader(request, await mint(env));
  }
  const headers = setCookie ? { "set-cookie": setCookie } : {};

  // limits: 5 messages a minute and 40 a day per connection, and an overall hourly ceiling (CHAT_GLOBAL_PER_HOUR, default 200). Keys are one-way scrambled codes, deleted after two days.
  const perHour = Math.max(10, Number(env.CHAT_GLOBAL_PER_HOUR) || 200);
  const slow = await checkThrottle(env, [
    { kind: "chat-ip-min", key: await hashKey(env, "chat", ip), max: 5, windowHours: 1 / 60, msg: "You're asking quickly. Please wait a minute and try again." },
    { kind: "chat-ip-day", key: await hashKey(env, "chat", ip), max: 40, windowHours: 24, msg: "You've reached today's limit for the AI assistant. Please try again tomorrow, or email info@socallights.app." },
    { kind: "chat-all", key: "all", max: perHour, windowHours: 1, msg: "The AI assistant is very busy right now. Please try again in a little while, or email info@socallights.app." },
  ]);
  if (slow) { await recordUsage(env, { blocked_limit: 1 }); return json({ error: slow, limited: true }, { status: 429, headers: { ...NO_STORE, ...headers } }); }

  // scope rules: no model call, no cost
  // The newest question must be in scope; an injection or personal data anywhere in the visitor's earlier messages is refused too (it would be sent to the model as history).
  const lastIdx = messages.length - 1;
  for (let i = 0; i <= lastIdx; i++) {
    if (messages[i].role !== "user") continue;
    const c = classify(messages[i].content);
    if (c.kind === "injection" || c.kind === "typedPersonal" || (i === lastIdx && c.kind !== "ok" && !(c.kind === "offtopic" && !first))) { // a short follow-up ("and the second one?") may have no site words of its own
      await recordUsage(env, { chats: first ? 1 : 0, turns: 1, blocked_scope: 1 });
      return say(c.reply, { refused: c.kind }, headers);
    }
  }

  // hard cost cap and daily chat limit
  const provider = providerOf(env), state = await usageState(env);
  const why = capReason(state, settings, provider);
  if (why) { await recordUsage(env, { capped: 1 }); return say(MESSAGES.capped, { capped: why }, headers); }

  let ctx, out;
  try {
    ctx = await buildContext(env, last);
    // nothing in the knowledge base matches: do not ask the model to improvise. Count the topic bucket (never the words) so we know what to write, and give the fallback link.
    if (!ctx.sourced) { await recordGap(env, topicOf(last)); await recordUsage(env, { chats: first ? 1 : 0, turns: 1, gaps: 1 }); return say(MESSAGES.gap, { gap: true }, headers); }
    // earlier assistant turns come from the browser, so they get the same output filter as a fresh answer (a forged one is dropped)
    const history = messages.slice(0, -1).filter((m) => m.role === "user" || !filterOutput(m.content, ctx).blocked);
    out = await runModel(env, ctx, [...history, messages[messages.length - 1]]);
  } catch {
    await recordUsage(env, { chats: first ? 1 : 0, turns: 1, errors: 1 });
    return say(MESSAGES.error, { error: true }, headers);
  }
  const f = filterOutput(out.text, ctx);
  await recordUsage(env, {
    chats: first ? 1 : 0, turns: 1, tokens_in: out.tin, tokens_out: out.tout, blocked_output: f.blocked ? 1 : 0,
    neurons: out.provider === "workers" ? neuronsFor(out.model, out.tin, out.tout) : 0, usd_micro: out.provider === "claude" ? claudeMicroUsd(out.tin, out.tout) : 0,
  });
  return say(f.text, f.blocked ? { filtered: f.blocked } : {}, headers);
}
