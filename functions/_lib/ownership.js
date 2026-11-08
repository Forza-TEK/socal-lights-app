// Who may buy a Featured placement for an event. Owning an event here means ONLY this: it does not give edit rights.
//   (a) they submitted it (normalized contact_email on event_submissions matches their account email), or
//   (b) they have an APPROVED claim for it (event_claims), or
//   (c) it is the map row of a contest they own or staff, and Admin has no open review note on it (contests.note = ''): a contest whose
//       organizer could not be matched to a website (free-mail, no site, mismatch) is live but cannot buy Featured until Admin clicks "Looks fine".
import { normEmail } from "./auth.js";

// Who may buy a Sponsor placement for an installer profile: its owner (installers.owner_email, set by a claim: an email at the company's website, or an admin).
// The same exact-match rule as the profile dashboard (api/installers/<slug>/manage.js). Owning a profile here gives no extra rights.
export const ownsInstaller = (inst, user) => !!inst && !!user && !!inst.owner_email && inst.owner_email === user.email;

export async function ownsEvent(env, user, eventId, subId) {
  if (subId) { // a pending submission: only by (a)
    const s = await env.DB.prepare("SELECT contact_email FROM event_submissions WHERE id = ?").bind(subId).first();
    return !!s && !!normEmail(user.email) && normEmail(s.contact_email) === normEmail(user.email);
  }
  if (!eventId) return false;
  const mine = normEmail(user.email);
  const subs = (await env.DB.prepare("SELECT contact_email FROM event_submissions WHERE event_id = ? LIMIT 20").bind(eventId).all()).results;
  if (mine && subs.some((s) => normEmail(s.contact_email) === mine)) return true;
  if (await env.DB.prepare("SELECT 1 FROM event_claims WHERE event_id = ? AND user_id = ? AND status = 'approved'").bind(eventId, user.id).first()) return true;
  return !!(await env.DB.prepare("SELECT 1 FROM contests c WHERE c.event_id = ?1 AND c.note = '' AND (c.owner_id = ?2 OR c.id IN (SELECT contest_id FROM contest_staff WHERE lower(email) = lower(?3)))").bind(eventId, user.id, user.email).first());
}
