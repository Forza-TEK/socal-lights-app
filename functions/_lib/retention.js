// How long a connection's network (IP) address is kept. The privacy policy promises "within two days"; this is where that is enforced.
// submit_log (raw IP of each form submission) and login_codes (IP of each sign-in code request) are pruned on every insert, and again by
// the scheduled admin digest. help_votes.who (a one-way fingerprint made from the IP, only used to stop repeat votes within a day) is blanked too.
export const IP_KEEP = "-48 hours";

export function ipPruneStatements(env) {
  return [
    env.DB.prepare(`DELETE FROM submit_log WHERE created_at < datetime('now','${IP_KEEP}')`),
    env.DB.prepare(`DELETE FROM login_codes WHERE created_at < datetime('now','${IP_KEEP}')`),
    env.DB.prepare(`UPDATE help_votes SET who = '' WHERE who != '' AND created_at < datetime('now','${IP_KEEP}')`),
  ];
}
// Best effort: a failed prune must never block the request it rides on.
export async function pruneIps(env) { try { await env.DB.batch(ipPruneStatements(env)); } catch {} }

// Personal data that outlives its purpose, purged or blanked on a schedule (privacy audit PL-04). The rows stay; only the personal text goes.
//   unconfirmed weekly-email signups : deleted after 30 days (an address someone else typed, never confirmed)
//   declined event submissions       : contact email blanked after 12 months
//   reports (name, message, contact) : blanked after 12 months
//   admin_log labels that name a person (Users, Reports areas) : blanked after 12 months
//   contest_changes co-organizer rows (they hold email addresses) : old/new blanked after 12 months
// Account deletion clears the same fields for that person at once (account.js).
export const UNCONFIRMED_KEEP = "-30 days";
export const RECORDS_KEEP = "-12 months";
export function retentionStatements(env) {
  const long = `datetime('now','${RECORDS_KEEP}')`;
  return [
    env.DB.prepare(`DELETE FROM alert_subs WHERE confirmed = 0 AND created_at < datetime('now','${UNCONFIRMED_KEEP}')`),
    env.DB.prepare(`UPDATE event_submissions SET contact_email = '' WHERE status = 'declined' AND contact_email != '' AND created_at < ${long}`),
    env.DB.prepare(`UPDATE reports SET name = '', message = '', contact = '' WHERE (name != '' OR message != '' OR contact != '') AND created_at < ${long}`),
    env.DB.prepare(`UPDATE admin_log SET label = '' WHERE label != '' AND area IN ('users','normalize','reports') AND at < ${long}`),
    env.DB.prepare(`UPDATE contest_changes SET old = '', new = '' WHERE field = 'Co-organizers' AND (old != '' OR new != '') AND at < ${long}`),
  ];
}
// Best effort, like pruneIps. Called by the scheduled admin digest.
export async function pruneRetention(env) { try { await env.DB.batch(retentionStatements(env)); } catch {} }
