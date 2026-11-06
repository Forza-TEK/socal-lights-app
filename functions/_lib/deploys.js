// Cloudflare Pages deploy-stall detection, read-only. Used by scripts/deploy-watch.mjs (scheduled workflow) and by the admin digest, so there is one rule.
//   (a) a deployment (preview or production: builds run one at a time, so a hung preview blocks production) still "active" 8+ minutes after it was created
//   (b) production not on main's HEAD 20+ minutes after that commit was made (no production deployment for it, or it failed)
// The head of main is passed in by the workflow (it has the checkout); the digest checks (a) and a failed newest production build only, so the site itself makes no call to any host but Cloudflare.
// Calls GET /accounts/<id>/pages/projects/<project>/deployments?per_page=15 with a token that needs Account > Cloudflare Pages > Read.
// If the token or the account id is missing, or Cloudflare answers 401/403, the result is state "not_configured" with the exact permission to add. Nothing is ever written.

export const PROJECT = "socal-lights";
export const STUCK_MIN = 8, BEHIND_MIN = 20;
export const NEEDS = "Account > Cloudflare Pages > Read";

const ACTIVE = new Set(["active"]);
const minutes = (iso, now) => (iso ? Math.max(0, Math.round((now - Date.parse(iso)) / 60000)) : 0);

// Pure. `deployments` is the API's result array (newest first); head = { sha, at (ISO commit time) } or null when GitHub's head is not known.
export function evaluateDeploys(deployments, head, now = Date.now()) {
  const problems = [];
  const list = Array.isArray(deployments) ? deployments : [];
  for (const d of list) {
    const st = d.latest_stage || {};
    if (!ACTIVE.has(st.status)) continue;
    const age = minutes(d.created_on, now);
    if (age >= STUCK_MIN) problems.push({ kind: "stuck", id: d.id, env: d.environment, stage: st.name, minutes: age, sha: (d.deployment_trigger && d.deployment_trigger.metadata && d.deployment_trigger.metadata.commit_hash || "").slice(0, 7),
      text: `A ${d.environment} deployment (${String(d.id).slice(0, 8)}) has been "${st.name}: active" for ${age} minutes. Builds run one at a time, so everything behind it waits.` });
  }
  const prod = list.filter((d) => d.environment === "production").sort((x, y) => String(y.created_on).localeCompare(String(x.created_on)));
  const newest = prod[0], sha = (d) => (d && d.deployment_trigger && d.deployment_trigger.metadata && d.deployment_trigger.metadata.commit_hash) || "";
  if (newest && (newest.latest_stage || {}).status === "failure" && minutes(newest.created_on, now) < 240) problems.push({ kind: "failed", id: newest.id, minutes: minutes(newest.created_on, now), sha: sha(newest).slice(0, 7), text: `The newest production deployment (${String(newest.id).slice(0, 8)}, commit ${sha(newest).slice(0, 7)}) failed ${minutes(newest.created_on, now)} minutes ago, so production is on an older version.` });
  if (head && head.sha) { // only the scheduled workflow knows main's head (it has the checkout); the digest passes none
    const behind = minutes(head.at, now);
    if (behind >= BEHIND_MIN && !prod.some((d) => sha(d) === head.sha)) problems.push({ kind: "behind", minutes: behind, sha: head.sha.slice(0, 7), text: `Production has no deployment for main's latest commit ${head.sha.slice(0, 7)} (made ${behind} minutes ago).` });
  }
  return { state: problems.length ? "stalled" : "ok", problems };
}

// Fetches and evaluates. fetchFn is injectable for tests. Never throws; network trouble is state "unknown".
export async function checkDeploys({ token, accountId, head = null, now = Date.now(), fetchFn = fetch }) {
  if (!token || !accountId) return { state: "not_configured", problems: [], why: `No Cloudflare token or account id. Needs a token with "${NEEDS}".` };
  let r;
  try {
    r = await fetchFn(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${PROJECT}/deployments?per_page=15`, { headers: { authorization: `Bearer ${token}` } });
  } catch { return { state: "unknown", problems: [], why: "Cloudflare did not answer." }; }
  if (r.status === 401 || r.status === 403) return { state: "not_configured", problems: [], why: `The Cloudflare token cannot read Pages deployments. Add "${NEEDS}" to it.` };
  if (!r.ok) return { state: "unknown", problems: [], why: `Cloudflare answered ${r.status}.` };
  const d = await r.json().catch(() => null);
  if (!d || !Array.isArray(d.result)) return { state: "unknown", problems: [], why: "Unreadable answer from Cloudflare." };
  return { ...evaluateDeploys(d.result, head, now), checked: d.result.length };
}
