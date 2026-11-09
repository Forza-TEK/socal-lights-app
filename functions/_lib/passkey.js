// Which organization a contest belongs to (for contest passes), and the gate every "contest goes live" path uses. See passes.js for the rules.
//   ORGANIZATION KEY: the registrable host of the contest website when it matches the organizer's verified email domain (trustOf, contests.js): "d:covinaca.gov".
//   Otherwise the organizer's own account email: "u:someone@gmail.com". Co-organizers and staff never create separate organizations (the creator's key is used).
//   Admin can merge keys (contest_org_alias) and rewrite them by hand.
import { trustOf, ownLabels, todayPT } from "./contests.js";
import { normEmail } from "./auth.js";
import { orgState, entitlementView } from "./passes.js";

export const hostOf = (s) => { try { return new URL(/^https?:/i.test(s) ? s : "https://" + s).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
// pasadena.gov -> pasadena.gov, parks.irvine.gov -> irvine.gov, www.foo.co.uk -> foo.co.uk
export function registrable(host) { const l = String(host || "").toLowerCase().replace(/\.$/, "").split(".").filter(Boolean), own = ownLabels(l.join(".")); return own < 1 ? l.join(".") : l.slice(own - 1).join("."); }
// "covinaca.gov", "https://example.com/page" or an email address, typed by Admin, as a key.
export function keyFromInput(s) {
  const t = String(s || "").trim();
  if (/^[du]:/i.test(t)) return t.slice(0, 2).toLowerCase() + t.slice(2).trim().toLowerCase();
  if (t.includes("@") && !/^https?:/i.test(t)) return "u:" + normEmail(t);
  const h = registrable(hostOf(t));
  return h ? "d:" + h : "";
}
export function rawOrgKey(email, site) { return trustOf(email, site) === "match" ? "d:" + registrable(hostOf(site)) : "u:" + normEmail(email); }
export async function orgKeyFor(env, email, site) {
  const k = rawOrgKey(email, site);
  const a = await env.DB.prepare("SELECT to_key FROM contest_org_alias WHERE from_key = ?").bind(k).first();
  return a ? a.to_key : k;
}
// The organization an account's next contest belongs to: from the website when one is given (even an empty one), else the one its latest live contest used, else the account itself.
export async function keyForUser(env, user, site) {
  if (site !== undefined && site !== null) return orgKeyFor(env, user.email, String(site));
  const c = await env.DB.prepare("SELECT org_key FROM contests WHERE owner_id = ? AND org_key != '' AND live_at != '' ORDER BY live_at DESC LIMIT 1").bind(user.id).first();
  return c ? c.org_key : orgKeyFor(env, user.email, "");
}

// The gate: may this organization put one more contest live today? { key, ent, ok, view }
export async function liveGate(env, email, site, today = todayPT()) {
  const key = await orgKeyFor(env, email, site), ent = await orgState(env, key, today);
  return { key, ent, ok: ent.canCreate, view: entitlementView(key, ent) };
}
export const PAYWALL_MESSAGE = "Running this contest needs a contest pass with room for it. Choose a pass to continue.";
