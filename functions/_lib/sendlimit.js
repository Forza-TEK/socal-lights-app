// Daily caps on email an account can send to third parties (neighbor invitations, judges, co-organizers, reminders).
// The mail comes from the site's own address, so this protects its sending reputation and the shared daily mail quota.
import { inWords } from "./submitlimit.js";
export const LIMITS ={ perCall: 10, perContestDay: 30, perAccountDay: 100 };

// Returns "" and records the send when it is allowed; otherwise returns the message to show (use it with a 429).
// `n` is the number of addresses about to be emailed. Only kind "invite" (neighbors) has the per-call and per-contest caps; every kind counts toward the account cap
// (judges, co-organizers and reminders are already bounded per contest: 15 judges, 8 co-organizers).
export async function reserveSends(env, user, contestId, kind, n) {
  if (!(n > 0)) return "";
  if (kind === "invite" && n > LIMITS.perCall) return `You can email up to ${LIMITS.perCall} addresses at a time. Send the rest in another batch.`;
  const uid = user && user.id ? user.id : "";
  if (!uid) return "Sign in to send invitations.";
  const used = async (sql, ...b) => ((await env.DB.prepare(sql).bind(...b).first()) || {}).s || 0;
  // seconds until the oldest send in the last 24 hours drops out of the window (so the person knows when more can go)
  const resetIn = async (where, bind) => Math.max(60, 86400 - (await used(`SELECT COALESCE(CAST(strftime('%s','now') AS INTEGER) - CAST(strftime('%s', MIN(created_at)) AS INTEGER), 0) AS s FROM email_send_log WHERE ${where} AND created_at > datetime('now','-1 day')`, bind)));
  if (kind === "invite" && contestId) {
    const day = await used("SELECT COALESCE(SUM(n),0) AS s FROM email_send_log WHERE contest_id = ? AND kind = 'invite' AND created_at > datetime('now','-1 day')", contestId);
    if (day + n > LIMITS.perContestDay) return `This contest can send ${LIMITS.perContestDay} invitations a day. ${Math.max(0, LIMITS.perContestDay - day)} left today. It resets in ${inWords(await resetIn("contest_id = ? AND kind = 'invite'", contestId))}.`;
  }
  const acct = await used("SELECT COALESCE(SUM(n),0) AS s FROM email_send_log WHERE user_id = ? AND created_at > datetime('now','-1 day')", uid);
  // These limits are per ACCOUNT (and per contest), never per network address, so a shared Wi-Fi does not matter here.
  if (acct + n > LIMITS.perAccountDay) return `Your account can send ${LIMITS.perAccountDay} invitation emails a day. ${Math.max(0, LIMITS.perAccountDay - acct)} left today. It resets in ${inWords(await resetIn("user_id = ?", uid))}, or email info@socallights.app if you need more.`;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO email_send_log (user_id, contest_id, kind, n) VALUES (?, ?, ?, ?)").bind(uid, contestId || null, kind, n),
    env.DB.prepare("DELETE FROM email_send_log WHERE created_at < datetime('now','-3 days')"),
  ]);
  return "";
}

// Free text an organizer adds to an invitation: no links (they could point anywhere under our name), no control characters, one line, 300 characters.
export function cleanNote(s) {
  return String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\b(?:https?:\/\/|ftp:\/\/|www\.)\S*/gi, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 300).trim();
}
