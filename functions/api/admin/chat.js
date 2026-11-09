// GET  /api/admin/chat — the AI assistant's switches, today's and this month's counters, the cost cap, and which provider and model the environment selects.
// POST /api/admin/chat — { enabled?, kill?, capUsd?, dailyMax?, tiers?: { 1?, 2?, 3? } }. Changes are logged by the middleware. Counters only; there is no message text to show.
import { json, err } from "../../_lib/util.js";
import { readSettings, writeSettings, isLive, usageState, topGaps, capReason, providerOf, workersModelOf, CAP_MAX_USD, DAILY_MAX_LIMIT, FREE_NEURONS_PER_DAY, RESERVE_NEURONS } from "../../_lib/chatsettings.js";

// Counters only: per action, this month's cards shown, finished and failed (chat_actions).
async function actionCounts(env) {
  try { return (await env.DB.prepare("SELECT action, SUM(shown) AS shown, SUM(done) AS done, SUM(failed) AS failed FROM chat_actions WHERE day >= date('now', 'start of month') GROUP BY action ORDER BY action").all()).results; } catch { return []; }
}
async function view(env) {
  const s = await readSettings(env), state = await usageState(env), provider = providerOf(env);
  return {
    settings: s, live: isLive(s, env), envKill: String(env.CHAT_KILL) === "1",
    provider, model: provider === "claude" ? String(env.CHAT_ANTHROPIC_MODEL || "claude-haiku-5-5") : workersModelOf(env),
    aiBinding: !!(env.AI && typeof env.AI.run === "function"), anthropicKey: !!env.ANTHROPIC_API_KEY, gateway: String(env.CHAT_AI_GATEWAY || ""),
    turnstile: !!env.TURNSTILE_SECRET,
    freeNeuronsPerDay: FREE_NEURONS_PER_DAY, capMaxUsd: CAP_MAX_USD, dailyMaxLimit: DAILY_MAX_LIMIT,
    reason: capReason(state, s, provider), reserveNeurons: RESERVE_NEURONS,
    today: state.today, monthUsd: state.monthUsd, monthChats: state.monthChats,
    days: state.rows.slice(-14), gaps: await topGaps(env), actions: await actionCounts(env),
  };
}
export async function onRequestGet({ env }) { return json(await view(env), { headers: { "cache-control": "no-store" } }); }

export async function onRequestPost({ request, env, data }) {
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") return err(400, "That couldn't be read.");
  const patch = {};
  for (const k of ["enabled", "kill"]) if (k in b) { if (typeof b[k] !== "boolean") return err(400, `${k} must be true or false.`); patch[k] = b[k]; }
  if ("capUsd" in b) { const n = Number(b.capUsd); if (!Number.isFinite(n) || n < 0 || n > CAP_MAX_USD) return err(400, `The monthly cap must be between $0 and $${CAP_MAX_USD}.`); patch.capUsd = n; }
  if ("dailyMax" in b) { const n = Number(b.dailyMax); if (!Number.isInteger(n) || n < 0 || n > DAILY_MAX_LIMIT) return err(400, `Chats per day must be a whole number from 0 to ${DAILY_MAX_LIMIT}.`); patch.dailyMax = n; }
  if ("tiers" in b) {
    if (!b.tiers || typeof b.tiers !== "object") return err(400, "tiers must be an object.");
    patch.tiers = {};
    for (const t of ["1", "2", "3"]) if (t in b.tiers) { if (typeof b.tiers[t] !== "boolean") return err(400, "Each tier must be true or false."); patch.tiers[Number(t)] = b.tiers[t]; }
  }
  if (!Object.keys(patch).length) return err(400, "Nothing to change.");
  await writeSettings(env, patch, (data && data.admin && data.admin.email) || "admin");
  return json(await view(env), { headers: { "cache-control": "no-store" } });
}
