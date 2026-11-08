// AI assistant model adapters. One function, two providers, chosen by the environment (never by the visitor):
//   workers (default): Cloudflare Workers AI through the AI binding, optionally through AI Gateway (env CHAT_AI_GATEWAY = the gateway's name).
//   claude: Anthropic Claude Haiku 5.5 over HTTPS, needs the Pages secret ANTHROPIC_API_KEY (never committed); set CHAT_PROVIDER = "claude" to switch. Optional gateway as above (needs CF_ACCOUNT_ID).
// Both return { text, tin, tout, model, provider }. Logging and caching in AI Gateway are asked to stay off so message text is not stored (docs/ai-assistant.md).
import { providerOf, workersModelOf } from "./chatsettings.js";

export const MAX_OUTPUT_TOKENS = 400;
const TIMEOUT_MS = 20000;
const est = (s) => Math.ceil(String(s || "").length / 3.5); // rough token estimate when the provider does not report usage

const withTimeout = (p, ms = TIMEOUT_MS) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("model timeout")), ms))]);

// A short model-agnostic reading of what Workers AI returns (shapes differ by model).
export function readWorkersReply(r) {
  if (!r) return "";
  if (typeof r === "string") return r;
  if (typeof r.response === "string") return r.response;
  if (r.choices && r.choices[0] && r.choices[0].message && typeof r.choices[0].message.content === "string") return r.choices[0].message.content;
  if (Array.isArray(r.output)) return r.output.filter((o) => o && o.type === "message").flatMap((o) => (o.content || []).map((c) => c && c.text || "")).join("");
  return "";
}

async function workers(env, { system, messages }) {
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("AI binding is not set up");
  const model = workersModelOf(env);
  const opts = env.CHAT_AI_GATEWAY ? { gateway: { id: String(env.CHAT_AI_GATEWAY), skipCache: true, collectLog: false } } : undefined;
  const input = model.includes("gpt-oss")
    ? { instructions: system, input: messages, max_output_tokens: MAX_OUTPUT_TOKENS, temperature: 0.2 }
    : { messages: [{ role: "system", content: system }, ...messages], max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.2 };
  const r = await withTimeout(env.AI.run(model, input, opts));
  const text = readWorkersReply(r), u = (r && r.usage) || {};
  const tin = u.prompt_tokens ?? u.input_tokens ?? est(system + messages.map((m) => m.content).join(" "));
  const tout = u.completion_tokens ?? u.output_tokens ?? est(text);
  return { text, tin, tout, model, provider: "workers" };
}

async function claude(env, { stableSystem, dynamicSystem, messages }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const model = String(env.CHAT_ANTHROPIC_MODEL || "claude-haiku-5-5");
  const gw = env.CHAT_AI_GATEWAY && env.CF_ACCOUNT_ID ? `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(env.CF_ACCOUNT_ID)}/${encodeURIComponent(env.CHAT_AI_GATEWAY)}/anthropic` : "";
  const headers = { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" };
  if (gw) { headers["cf-aig-collect-log"] = "false"; headers["cf-aig-skip-cache"] = "true"; if (env.CHAT_AI_GATEWAY_TOKEN) headers["cf-aig-authorization"] = "Bearer " + env.CHAT_AI_GATEWAY_TOKEN; }
  const body = { model, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.2, system: [{ type: "text", text: stableSystem, cache_control: { type: "ephemeral" } }, { type: "text", text: dynamicSystem }], messages };
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch((gw || "https://api.anthropic.com") + "/v1/messages", { method: "POST", headers, body: JSON.stringify(body), signal: ctl.signal });
    if (!res.ok) throw new Error("claude " + res.status);
    const d = await res.json();
    const text = (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    const u = d.usage || {};
    return { text, tin: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0), tout: u.output_tokens || est(text), model, provider: "claude" };
  } finally { clearTimeout(timer); }
}

// ctx: { system (one string), stableSystem, dynamicSystem } from buildContext. env.CHAT_TEST_MODEL (a function) replaces both providers in tests; it is never set in production.
export async function runModel(env, ctx, messages) {
  const args = { system: ctx.stableSystem + "\n\n" + ctx.dynamicSystem, stableSystem: ctx.stableSystem, dynamicSystem: ctx.dynamicSystem, messages };
  if (typeof env.CHAT_TEST_MODEL === "function") {
    const r = await env.CHAT_TEST_MODEL(args);
    const p = providerOf(env);
    return { text: r.text, tin: r.tin ?? est(args.system), tout: r.tout ?? est(r.text), model: "mock", provider: p };
  }
  return providerOf(env) === "claude" ? claude(env, args) : workers(env, args);
}
