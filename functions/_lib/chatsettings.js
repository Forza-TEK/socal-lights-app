// AI assistant: settings (Admin > AI assistant), the daily counters and the hard cost cap. See docs/ai-assistant.md.
// Counters only: nothing here holds message text, an IP address or any visitor id.

export const DEFAULTS = { chat_enabled: "0", chat_kill: "0", chat_cap_usd: "0", chat_daily_max: "300", chat_tier1: "1", chat_tier2: "1", chat_tier3: "1" };
export const CAP_MAX_USD = 10; // the highest monthly cap Admin accepts
export const DAILY_MAX_LIMIT = 5000;

// Cloudflare Workers AI: free allowance per UTC day and the price above it (https://developers.cloudflare.com/workers-ai/platform/pricing/, read 2026-11-08).
export const FREE_NEURONS_PER_DAY = 10000;
export const USD_PER_1000_NEURONS = 0.011;
// Neurons per million tokens (input, output) for the Workers AI models the assistant may use. Only models listed here can be selected.
export const WORKERS_MODELS = {
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast": { nIn: 4119, nOut: 34868 },
  "@cf/openai/gpt-oss-20b": { nIn: 18182, nOut: 27273 },
  "@cf/ibm-granite/granite-4.0-h-micro": { nIn: 1542, nOut: 10158 },
};
export const DEFAULT_WORKERS_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
// Claude Haiku 5.5: $0.10 per million input tokens, $0.50 per million output (platform.claude.com pricing, read 2026-11-08). The 1.3 factor is a margin for the newer tokenizer.
export const CLAUDE_RATES = { inUsdPerM: 0.1, outUsdPerM: 0.5, margin: 1.3 };
export const RESERVE_NEURONS = 250;   // headroom kept for one more answer before the free allowance is used up
export const RESERVE_USD = 0.01;      // headroom kept for one more answer on the paid path

export const utcDay = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

export const providerOf = (env) => (String((env && env.CHAT_PROVIDER) || "").toLowerCase() === "claude" ? "claude" : "workers");
export const workersModelOf = (env) => (env && WORKERS_MODELS[env.CHAT_MODEL] ? env.CHAT_MODEL : DEFAULT_WORKERS_MODEL);

const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function normalize(raw) {
  const r = { ...DEFAULTS, ...raw };
  return {
    enabled: r.chat_enabled === "1",
    kill: r.chat_kill === "1",
    capUsd: Math.round(num(r.chat_cap_usd, 0, CAP_MAX_USD, 0) * 100) / 100,
    dailyMax: Math.round(num(r.chat_daily_max, 0, DAILY_MAX_LIMIT, 300)),
    tiers: { 1: r.chat_tier1 !== "0", 2: r.chat_tier2 !== "0", 3: r.chat_tier3 !== "0" }, // which kinds of action cards may appear (docs/ai-assistant-actions-design.md)
  };
}
// Never throws: any problem reads as "off".
export async function readSettings(env) {
  try {
    const { results } = await env.DB.prepare("SELECT key, value FROM chat_settings").all();
    return normalize(Object.fromEntries(results.map((r) => [r.key, r.value])));
  } catch { return normalize({}); }
}
// The assistant answers only when it is switched on, the kill switch is off and the environment kill variable (CHAT_KILL = "1", set in Pages settings, no deploy needed) is not set.
export const isLive = (s, env) => !!s.enabled && !s.kill && !(env && String(env.CHAT_KILL) === "1");

export async function writeSettings(env, patch, who = "") {
  const out = [];
  const set = (k, v) => out.push(env.DB.prepare("INSERT INTO chat_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(k, String(v), String(who).slice(0, 120)));
  if ("enabled" in patch) set("chat_enabled", patch.enabled ? "1" : "0");
  if ("kill" in patch) set("chat_kill", patch.kill ? "1" : "0");
  if ("capUsd" in patch) set("chat_cap_usd", num(patch.capUsd, 0, CAP_MAX_USD, 0));
  if (patch.tiers) for (const t of [1, 2, 3]) if (t in patch.tiers) set("chat_tier" + t, patch.tiers[t] ? "1" : "0");
  if ("dailyMax" in patch) set("chat_daily_max", Math.round(num(patch.dailyMax, 0, DAILY_MAX_LIMIT, 300)));
  if (out.length) await env.DB.batch(out);
}

// ---------- usage ----------
export const neuronsFor = (model, tin, tout) => { const m = WORKERS_MODELS[model] || WORKERS_MODELS[DEFAULT_WORKERS_MODEL]; return Math.ceil((tin * m.nIn + tout * m.nOut) / 1e6); };
// Millionths of a dollar: (USD per million tokens) x tokens is already in millionths of a dollar.
export const claudeMicroUsd = (tin, tout) => Math.ceil((tin * CLAUDE_RATES.inUsdPerM + tout * CLAUDE_RATES.outUsdPerM) * CLAUDE_RATES.margin);

const monthOf = (day) => day.slice(0, 7);
// Everything the cap decision needs, in one query: this UTC month's rows (at most 31).
export async function usageState(env, day = utcDay()) {
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT * FROM chat_usage WHERE day >= ? AND day <= ? ORDER BY day").bind(monthOf(day) + "-01", monthOf(day) + "-31").all()).results; } catch {}
  const today = rows.find((r) => r.day === day) || { day, chats: 0, turns: 0, tokens_in: 0, tokens_out: 0, neurons: 0, usd_micro: 0, blocked_scope: 0, blocked_output: 0, blocked_limit: 0, capped: 0, errors: 0, gaps: 0 };
  // Workers AI is free up to FREE_NEURONS_PER_DAY each UTC day and billed above that; the paid Claude path is billed from the first token.
  const overageUsd = rows.reduce((a, r) => a + (Math.max(0, r.neurons - FREE_NEURONS_PER_DAY) / 1000) * USD_PER_1000_NEURONS, 0);
  const claudeUsd = rows.reduce((a, r) => a + r.usd_micro / 1e6, 0);
  return { day, today, rows, monthUsd: Math.round((overageUsd + claudeUsd) * 10000) / 10000, monthChats: rows.reduce((a, r) => a + r.chats, 0) };
}

// Returns "" when one more answer is allowed, "daily" when today's chat limit is reached, "cap" when the dollar cap (or the free allowance when the cap is $0) is used up.
export function capReason(state, settings, provider) {
  if (settings.dailyMax <= 0 || state.today.chats >= settings.dailyMax) return "daily";
  const cap = settings.capUsd;
  if (provider === "claude") return state.monthUsd + RESERVE_USD > cap ? "cap" : ""; // the paid path never runs on a $0 cap
  const t = state.today.neurons, over = (n) => Math.max(0, n - FREE_NEURONS_PER_DAY);
  if (cap <= 0) return t + RESERVE_NEURONS > FREE_NEURONS_PER_DAY ? "cap" : "";   // free allowance only
  const extra = ((over(t + RESERVE_NEURONS) - over(t)) / 1000) * USD_PER_1000_NEURONS;
  return state.monthUsd + extra > cap ? "cap" : "";
}

// One count under a topic bucket (a fixed name from our own list, never any of the visitor's words) when the knowledge base had nothing for a question.
export async function recordGap(env, topic, day = utcDay()) {
  try {
    await env.DB.prepare("INSERT INTO chat_topics (day, topic, n) VALUES (?, ?, 1) ON CONFLICT(day, topic) DO UPDATE SET n = n + 1").bind(day, String(topic).slice(0, 40)).run();
    await env.DB.prepare("DELETE FROM chat_topics WHERE day < date(?, '-120 days')").bind(day).run();
  } catch {}
}
export async function topGaps(env, days = 30, day = utcDay()) {
  try { return (await env.DB.prepare("SELECT topic, SUM(n) AS n FROM chat_topics WHERE day >= date(?, ?) GROUP BY topic ORDER BY n DESC LIMIT 15").bind(day, `-${days} days`).all()).results; } catch { return []; }
}
// Adds to today's row. d: { chats, turns, tokens_in, tokens_out, neurons, usd_micro, blocked_scope, blocked_output, blocked_limit, capped, errors, gaps }
const COLS = ["chats", "turns", "tokens_in", "tokens_out", "neurons", "usd_micro", "blocked_scope", "blocked_output", "blocked_limit", "capped", "errors", "gaps"];
export async function recordUsage(env, d, day = utcDay()) {
  try {
    const v = COLS.map((c) => Math.max(0, Math.round(Number(d[c]) || 0)));
    if (!v.some((x) => x)) return;
    await env.DB.prepare(`INSERT INTO chat_usage (day, ${COLS.join(", ")}) VALUES (?, ${COLS.map(() => "?").join(", ")}) ON CONFLICT(day) DO UPDATE SET ${COLS.map((c) => `${c} = ${c} + excluded.${c}`).join(", ")}`).bind(day, ...v).run();
    await env.DB.prepare("DELETE FROM chat_usage WHERE day < date(?, '-120 days')").bind(day).run();
  } catch {}
}
