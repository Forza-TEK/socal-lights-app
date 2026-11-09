// POST /api/chat — the AI assistant. OFF until Admin > AI assistant switches it on (setting chat_enabled); a kill switch stops it at once. See docs/ai-assistant.md.
// Body: { messages: [{role, content}, ...] (the last 6 turns, ending with the visitor's), token: Turnstile token (needed for the first message of a visit only) }.
// Answer: { reply, ... }. Order of checks: switch, same origin, body size and shape, "I am human" check (once per visit, then a signed 30-minute cookie that carries no identity),
// limits per connection and overall, scope rules (no model call for off-topic, injection, personal data, contest rules), the cost cap, the model, the output filter.
// Nothing is logged but anonymous daily counters: no message text and no IP address (the limits use one-way scrambled codes kept two days, as for the other forms).
import { json, err, verifyTurnstile } from "../_lib/util.js";
import { sameOriginStrict, getUser } from "../_lib/auth.js";
import { ownListings } from "../_lib/chatown.js";
import { checkThrottle, hashKey } from "../_lib/throttle.js";
import { readSettings, isLive, usageState, capReason, recordUsage, recordGap, neuronsFor, claudeMicroUsd, providerOf } from "../_lib/chatsettings.js";
import { parseMessages, classify, filterOutput, MESSAGES } from "../_lib/chatguard.js";
import { buildContext, topicOf } from "../_lib/chatkb.js";
import { runModel } from "../_lib/chatmodel.js";
import { cardsFor, humanCard, wantsHuman, needsAccount, quickIntent } from "../_lib/chatcards.js";
import { bumpAction } from "../_lib/chatactions.js";
import { checkCapAlerts } from "../_lib/chatmail.js";

import { COOKIE, mint, validSession, cookieHeader } from "../_lib/chatsession.js";
const NO_STORE = { "cache-control": "no-store" };
const say = (reply, extra = {}, headers = {}) => json({ reply, ...extra }, { headers: { ...NO_STORE, ...headers } });

// Tier 3 reads who is signed in only when the visitor asked to change one of their own listings or to add an event; nothing about them is stored or sent to the model.
async function signedIn(request, env, settings, last) {
  if (!settings.tiers[3] || !needsAccount(last)) return {};
  const user = await getUser(request, env).catch(() => null);
  return user ? { user, own: await ownListings(env, user) } : {};
}

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

  // "Can I talk to a person?": always answered with the Send to the team card, even off topic, at the cap, or with no model call (owner decision: always reachable)
  if (settings.tiers[1] && wantsHuman(last) && !(["injection", "typedPersonal", "personal"].includes(classify(last).kind))) { // "the owner's phone number" is a personal-data ask, not a request for the team
    await recordUsage(env, { chats: first ? 1 : 0, turns: 1 }); await bumpAction(env, "ask_human", "shown");
    return say("Of course. Write what you need in the box below and tap Send to the team: the team reads every message. If you add your email, they can reply to you.", { cards: [humanCard(last)] }, headers);
  }
  // Tier 1 requests that read as off topic to the scope filter ("subscribe me", "this listing is outdated"): answer with the card, no model call
  { const qi = quickIntent(last, settings); if (qi && classify(last).kind === "offtopic") { await recordUsage(env, { chats: first ? 1 : 0, turns: 1 }); for (const c of qi.cards) await bumpAction(env, c.action, "shown"); return say(qi.reply, { cards: qi.cards }, headers); } }
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
  if (why) { await recordUsage(env, { capped: 1 }); const hc = settings.tiers[1] ? [humanCard(last)] : []; if (hc.length) await bumpAction(env, "ask_human", "shown"); return say(MESSAGES.capped, { capped: why, cards: hc }, headers); }

  let ctx, out;
  try {
    ctx = await buildContext(env, last);
    // nothing in the knowledge base matches: do not ask the model to improvise. Count the topic bucket (never the words) so we know what to write, and give the fallback link.
    if (!ctx.sourced) { await recordGap(env, topicOf(last)); await recordUsage(env, { chats: first ? 1 : 0, turns: 1, gaps: 1 }); const { user: gu, own: go } = await signedIn(request, env, settings, last); const hc = cardsFor({ question: last, settings, ctx, handoff: "gap", user: gu, own: go }); for (const c of hc) await bumpAction(env, c.action || c.type, "shown"); return say(MESSAGES.gap, { gap: true, cards: hc }, headers); }
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
  // Tier 3 reads who is signed in, only when the visitor asked to change one of their own listings; nothing about them is stored or sent to the model
  const { user, own } = f.blocked ? {} : await signedIn(request, env, settings, last);
  const cards = f.blocked ? [] : cardsFor({ question: last, settings, ctx, user, own });
  for (const c of cards) await bumpAction(env, c.action || c.type, "shown");
  if (settings.capUsd > 0) await checkCapAlerts(env, settings); // 80% and 100% emails, once a month each
  return say(f.text, { ...(f.blocked ? { filtered: f.blocked } : {}), ...(cards.length ? { cards } : {}) }, headers);
}
