// The "Founder city" badge: a label on the contests of an organization whose comp carries badge = 1, shown while the comp is not revoked and today <= badge_until (its own end date,
// which may be later than the free contest's valid_until; blank = valid_until).
// It is display only. Nothing here is used by results, votes, judging, ranking or ordering, and it never implies the city endorses SoCal Lights.
import { todayPT } from "./contests.js";

export const FOUNDER_LABEL = "Founder city";
export const FOUNDER_TIP = "Founder city: one of the first cities to run contests on SoCal Lights";

// The organization keys that carry the badge today (one small read).
export async function founderKeys(env, today = todayPT()) {
  const { results } = await env.DB.prepare("SELECT DISTINCT org_key FROM contest_comps WHERE badge = 1 AND revoked = 0 AND COALESCE(NULLIF(badge_until, ''), valid_until) >= ?").bind(today).all();
  return new Set(results.map((r) => r.org_key));
}
export const isFounder = (keys, orgKey) => !!orgKey && keys.has(orgKey);
