// robots.txt courtesy for everything our own code fetches from other sites (RFC 9309). Cloudflare's verified-bot policy requires a bot to obey robots.txt, and it is simply polite.
// parseRobots picks the group for our product token (or `*`), robotsAllows applies the longest matching rule (Allow wins a tie; `*` and `$` work), robotsCheck fetches and caches a host's file.
// Missing file or any 4xx = no restrictions; a server error or no answer = treated as "unknown": we allow (a refusal here would only be our own timeout) but never cache it.
export const BOT_TOKEN = "SoCalLightsBot";

export function parseRobots(text, token = BOT_TOKEN) {
  const groups = []; let cur = null, lastWasAgent = false;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim(); if (!line) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === "user-agent") { if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (cur && (k === "allow" || k === "disallow")) cur.rules.push({ allow: k === "allow", path: v });
  }
  const t = token.toLowerCase(), named = groups.filter((g) => g.agents.some((a) => a && a !== "*" && t.includes(a))), star = groups.filter((g) => g.agents.includes("*"));
  return (named.length ? named : star).flatMap((g) => g.rules);
}

const toRegex = (p) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
export function robotsAllows(rules, pathAndQuery) {
  let best = null;
  for (const r of rules) {
    if (!r.path) { if (!r.allow) continue; }              // "Disallow:" with nothing means allow everything
    if (r.path && !toRegex(r.path).test(pathAndQuery)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow && !best.allow)) best = { len, allow: r.allow };
  }
  return !best || best.allow;
}

const cache = new Map(); // host -> { rules, at }
const HOUR = 3600_000;
/** true when robots.txt lets SoCalLightsBot read this URL. doFetch is injectable for tests. */
export async function robotsCheck(url, doFetch = fetch, now = Date.now()) {
  let u; try { u = new URL(url); } catch { return true; }
  const key = u.origin, hit = cache.get(key);
  let rules = hit && now - hit.at < HOUR ? hit.rules : null;
  if (!rules) {
    try {
      const r = await doFetch(u.origin + "/robots.txt", { redirect: "follow", headers: { "user-agent": `Mozilla/5.0 (compatible; ${BOT_TOKEN}/1.0; +https://socallights.app/bot)`, accept: "text/plain,*/*" }, signal: AbortSignal.timeout(4000) });
      if (r.ok) rules = parseRobots((await r.text()).slice(0, 500_000));
      else if (r.status >= 400 && r.status < 500) rules = [];           // no file, or the file is behind a wall: no restrictions we can read
      else return true;                                                 // server error: unknown, do not cache
      cache.set(key, { rules, at: now });
    } catch { return true; }
  }
  return robotsAllows(rules, u.pathname + u.search);
}
export const _clearRobotsCache = () => cache.clear();
