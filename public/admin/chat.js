// Admin > AI assistant: the on/off switch, the kill switch, the cost cap and today's and this month's counters. Counters only: there is no message text to read.
import { esc, btn, tap, toast } from "/admin/kit.js?v=20261113a";

const $ = (s) => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {}, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
}
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const usd = (n) => "$" + Number(n || 0).toFixed(2);

export async function renderChat(main) {
  const d = await api("/api/admin/chat");
  const s = d.settings, t = d.today;
  const pct = Math.min(100, Math.round((t.neurons / d.freeNeuronsPerDay) * 100));
  const state = d.live ? ["ok", "On: answering visitors"] : s.kill || d.envKill ? ["bad", "Stopped by the kill switch"] : ["", "Off (visitors do not see it)"];
  const why = d.reason === "cap" ? "Cost cap reached: it is giving the \"reached its limit\" message." : d.reason === "daily" ? "Today's chat limit is reached: it is giving the \"reached its limit\" message until tomorrow (UTC)." : "";
  const ready = [];
  if (d.provider === "workers" && !d.aiBinding) ready.push("The Workers AI binding is not connected on this deployment, so every question would get the error message. See docs/ai-assistant.md.");
  if (d.provider === "claude" && !d.anthropicKey) ready.push("The ANTHROPIC_API_KEY secret is not set, so every question would get the error message.");
  if (d.provider === "claude" && s.capUsd <= 0) ready.push("The Claude path costs money and your monthly cap is $0, so it will not answer. Raise the cap or switch back to Workers AI (remove CHAT_PROVIDER).");
  if (!d.turnstile) ready.push("TURNSTILE_SECRET is not set, so the \"I am human\" check is skipped.");
  main.innerHTML = `<p class="meta" style="margin:0 0 12px">The AI assistant answers questions about help articles, prices and events only. It is <b>off</b> until you turn it on here. It stores no message text and no IP address, only the counts below. How it works, and what to check before turning it on: docs/ai-assistant.md.</p>
    <section class="ucard u-${state[0] === "ok" ? "ok" : state[0] === "bad" ? "limit" : "ok"}" aria-label="Switches"><div class="uh"><h3>Status</h3><span class="tag ${state[0]}">${esc(state[1])}</span></div>
      ${why ? `<p class="msg err" role="status">${esc(why)}</p>` : ""}
      ${ready.map((r) => `<p class="msg err">${esc(r)}</p>`).join("")}
      <div class="ra" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
        ${btn(s.enabled ? "ghost" : "main", s.enabled ? "Turn the assistant off" : "Turn the assistant on", 'id="cEnable"')}
        ${s.kill ? btn("main", "Release the kill switch", 'id="cKill"') : btn("danger", "Kill switch: stop it now", 'id="cKill"')}
      </div>
      <p class="meta" style="margin:8px 0 0">The kill switch stops answers immediately and wins over the on/off switch. ${d.envKill ? "<b>CHAT_KILL is also set in Cloudflare settings</b>, which keeps it stopped until you remove it there. " : "In an emergency you can also set CHAT_KILL = 1 in Cloudflare Pages settings (no deploy needed). "}The map and chat button may keep showing for up to 5 minutes; visitors then see a polite \"not available\" message.</p>
    </section>
    <h2 class="dh">Cost cap</h2>
    <section class="ucard u-ok" aria-label="Cost cap"><div class="uh"><h3>Monthly hard cap</h3><span class="tag">${s.capUsd > 0 ? usd(s.capUsd) + " a month" : "$0: free allowance only"}</span></div>
      <p class="unum"><b>${usd(d.monthUsd)}</b> counted this month (UTC) <span class="meta">of ${usd(s.capUsd)} allowed</span></p>
      <form id="cCap" class="row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-top:8px">
        <label style="display:grid;gap:4px">Monthly cap in dollars (0 to ${d.capMaxUsd})<input id="cCapIn" type="number" min="0" max="${d.capMaxUsd}" step="0.5" value="${esc(s.capUsd)}" inputmode="decimal" style="min-height:44px;padding:8px 10px"></label>
        <label style="display:grid;gap:4px">Most chats per day (UTC)<input id="cDayIn" type="number" min="0" max="${d.dailyMaxLimit}" step="1" value="${esc(s.dailyMax)}" inputmode="numeric" style="min-height:44px;padding:8px 10px"></label>
        <button type="submit" class="btn ice">Save limits</button><span class="msg" role="status" id="cCapMsg"></span>
      </form>
      <p class="meta" style="margin:8px 0 0">$0 means the assistant stops when Cloudflare's free daily allowance (${fmt(d.freeNeuronsPerDay)} neurons, resets 00:00 UTC) is used up, so it can cost nothing. A higher cap lets it use paid Workers AI (or the Claude path, if switched on) until the month's counted cost reaches the cap. The counted cost is an estimate from token counts; Cloudflare's and Anthropic's own dashboards are the source of truth.</p>
    </section>
    <h2 class="dh">Usage</h2>
    <div class="ugrid">
      <article class="ucard u-ok" aria-label="Free allowance today"><div class="uh"><h3>Workers AI today</h3></div>
        <p class="unum"><b>${fmt(t.neurons)}</b> of ${fmt(d.freeNeuronsPerDay)} free neurons <span class="meta">(${pct}%)</span></p>
        <div class="ubar" role="progressbar" aria-label="Free neurons used today" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${pct}% of today's free allowance"><i style="width:${pct}%"></i></div>
        <p class="meta ures">Resets at 00:00 UTC (4 pm Pacific in winter, 5 pm in summer).</p></article>
      <article class="ucard u-ok" aria-label="Chats today"><div class="uh"><h3>Chats today</h3></div>
        <p class="unum"><b>${fmt(t.chats)}</b> of ${fmt(s.dailyMax)} allowed <span class="meta">(${fmt(t.turns)} questions answered)</span></p>
        <p class="meta ures">This month: ${fmt(d.monthChats)} chats.</p></article>
      <article class="ucard u-ok" aria-label="Refused or stopped today"><div class="uh"><h3>Stopped today</h3></div>
        <p class="meta" style="margin:6px 0 0">Out of scope or unsafe question: <b>${fmt(t.blocked_scope)}</b><br>Answer replaced by the safety filter (price, date, link): <b>${fmt(t.blocked_output)}</b><br>Rate limited: <b>${fmt(t.blocked_limit)}</b><br>Hit the cost or daily cap: <b>${fmt(t.capped)}</b><br>Nothing in the knowledge base matched: <b>${fmt(t.gaps)}</b><br>Model errors: <b>${fmt(t.errors)}</b></p></article>
    </div>
    <p class="meta">Provider in use: <b>${esc(d.provider === "claude" ? "Claude (paid)" : "Cloudflare Workers AI")}</b>, model <code>${esc(d.model)}</code>${d.gateway ? `, through AI Gateway <code>${esc(d.gateway)}</code>` : ", no AI Gateway"}. Tokens today: ${fmt(t.tokens_in)} in, ${fmt(t.tokens_out)} out. The provider is chosen by Cloudflare settings (CHAT_PROVIDER), not here.</p>
    <h2 class="dh">Actions</h2>
    <section class="ucard u-ok" aria-label="Actions"><div class="uh"><h3>What the assistant can do for visitors</h3></div>
      <p class="meta" style="margin:0 0 8px">The assistant can offer a card the visitor fills in and taps: send a message to you (Tier 1), look things up and link to pages (Tier 2), and signed-in changes to their own listings (Tier 3, coming). These switches only matter while the assistant itself is on; the kill switch stops all of it.</p>
      <div class="ra" style="display:flex;gap:10px;flex-wrap:wrap">
        ${[[1, "Tier 1: send to the team, report, weekly email, remove a home"], [2, "Tier 2: find places, plan a night, contest pages"], [3, "Tier 3: signed-in changes (not built yet)"]].map(([n, label]) => btn(s.tiers[n] ? "ghost" : "main", (s.tiers[n] ? "Turn off " : "Turn on ") + label, `data-tier="${n}"`)).join("")}
      </div>
      ${(d.actions || []).length ? `<div class="tablewrap"><table><thead><tr><th scope="col">Action (this month)</th><th scope="col">Shown</th><th scope="col">Finished</th><th scope="col">Failed</th></tr></thead><tbody>${d.actions.map((a) => `<tr><td>${esc(a.action)}</td><td>${fmt(a.shown)}</td><td>${fmt(a.done)}</td><td>${fmt(a.failed)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="meta" style="margin:8px 0 0">No action cards shown yet this month. Only counts are kept, never what visitors wrote.</p>`}
    </section>
    <h2 class="dh">Unanswered topics (last 30 days)</h2>
    ${d.gaps.length ? `<p class="meta">Questions nothing in the help or knowledge base matched, grouped by a fixed topic bucket. Only the bucket is counted, never the question. Write or improve help articles in these areas first.</p><div class="tablewrap"><table><thead><tr><th scope="col">Topic</th><th scope="col">Unanswered</th></tr></thead><tbody>${d.gaps.map((g) => `<tr><td>${esc(g.topic)}</td><td>${fmt(g.n)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="meta">Nothing yet.</p>`}
    ${d.days.length ? `<details class="utrend"><summary>Last ${d.days.length} days</summary><div class="tablewrap"><table><thead><tr><th scope="col">UTC day</th><th scope="col">Chats</th><th scope="col">Questions</th><th scope="col">Neurons</th><th scope="col">Claude cost</th><th scope="col">Stopped</th><th scope="col">Errors</th></tr></thead><tbody>${d.days.slice().reverse().map((r) => `<tr><td>${esc(r.day)}</td><td>${fmt(r.chats)}</td><td>${fmt(r.turns)}</td><td>${fmt(r.neurons)}</td><td>${usd(r.usd_micro / 1e6)}</td><td>${fmt(r.blocked_scope + r.blocked_output + r.blocked_limit + r.capped)}</td><td>${fmt(r.errors)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}`;

  const patch = async (body, msg) => { try { await api("/api/admin/chat", { method: "POST", body: JSON.stringify(body) }); toast(msg); renderChat(main); } catch (e) { toast(e.message, true); } };
  $("#cEnable").onclick = () => patch({ action: "toggle", enabled: !s.enabled }, s.enabled ? "Assistant turned off" : "Assistant turned on");
  $("#cKill").onclick = (e) => { if (s.kill) return patch({ action: "resume", kill: false }, "Kill switch released"); if (tap(e.currentTarget, "stop the assistant")) patch({ action: "kill", kill: true }, "Assistant stopped"); };
  for (const b of main.querySelectorAll("[data-tier]")) b.onclick = () => patch({ action: "tier", tiers: { [b.dataset.tier]: !s.tiers[b.dataset.tier] } }, "Saved");
  $("#cCap").onsubmit = (e) => { e.preventDefault(); patch({ action: "limits", capUsd: Number($("#cCapIn").value), dailyMax: Number($("#cDayIn").value) }, "Limits saved"); };
}
